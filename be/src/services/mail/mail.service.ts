import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma/prisma.service';

/** Cấu hình email admin chỉnh trong Cài đặt site → tab Email (lưu trong SiteConfig.mail) */
interface MailTemplateOverride {
  subject?: string;
  intro?: string;
}
interface MailConfig {
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  address?: string;
  copyright?: string;
  footerNote?: string;
  templates?: {
    contactNotify?: MailTemplateOverride;
    contactConfirm?: MailTemplateOverride;
    orderNotify?: MailTemplateOverride;
    orderConfirm?: MailTemplateOverride;
    otp?: { intro?: string };
  };
}
import { randomUUID } from 'node:crypto';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Dữ liệu liên hệ tối thiểu để render email (tương thích Prisma Contact) */
export interface ContactMailPayload {
  id?: number;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}

/** Dữ liệu đơn hàng tối thiểu để render email (tương thích Prisma Order + items) */
export interface OrderMailPayload {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  note?: string | null;
  subtotal: unknown;
  discount: unknown;
  total: unknown;
  voucherCode?: string | null;
  items: { name: string; price: unknown; qty: number }[];
}

/** Kết quả render 1 email: đủ subject + html + text (plain-text alternative) */
export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

/** Tuỳ chọn gửi mail nội bộ (đã dựng sẵn nội dung) */
interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  listUnsubscribe?: string;
}

/** Bảng màu thương hiệu VHD — dùng inline khắp template */
const BRAND = {
  blue: '#1B3A8C',
  blueDark: '#14286A',
  gold: '#F5A623',
  red: '#C8102E',
  pageBg: '#eef1f8',
  card: '#ffffff',
  softBg: '#f5f7fc',
  border: '#e2e6f0',
  text: '#1f2937',
  muted: '#6b7280',
  footMuted: '#8a93a6',
} as const;

/**
 * MailService — gửi email qua SMTP (nodemailer).
 * Thiếu SMTP_HOST/USER/PASS → tự chuyển JSON transport (dry-run):
 * email không gửi thật, chỉ log `[MAIL:DRY-RUN]` để test end-to-end.
 * Mọi lỗi gửi mail chỉ log, KHÔNG throw — không được làm hỏng API.
 *
 * Mọi email đều có bản HTML (bảng-based, inline CSS, an toàn email client)
 * SONG SONG với bản plain-text, kèm header chống spam (replyTo, messageId,
 * X-Entity-Ref-ID, List-Unsubscribe) — giúp giảm nguy cơ vào hộp spam.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly dryRun: boolean;

  /** Cache cấu hình mail từ DB — refresh mỗi lần gửi (TTL 60s) */
  private mailCfg: MailConfig = {};
  private mailCfgAt = 0;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.dryRun = false;
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: { user, pass },
      });
      this.logger.log(`SMTP transport sẵn sàng (${host})`);
    } else {
      this.dryRun = true;
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn(
        'Thiếu SMTP_HOST/SMTP_USER/SMTP_PASS — MailService chạy chế độ DRY-RUN (không gửi email thật)',
      );
    }
  }

  // ───────────────────────── Public API ─────────────────────────

  /** Thông báo liên hệ mới cho admin (ADMIN_EMAIL). Reply-To = email khách. */
  async sendContactNotification(contact: ContactMailPayload): Promise<void> {
    await this.refreshMailConfig();
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL trống — bỏ qua email thông báo admin');
      return;
    }
    const { subject, html, text } = this.buildContactNotification(contact);
    await this.send({
      to: adminEmail,
      subject,
      html,
      text,
      // Admin bấm "Trả lời" là gửi thẳng cho khách hàng
      replyTo: this.formatReplyTo(contact.name, contact.email),
    });
  }

  /** Email xác nhận đã nhận yêu cầu, gửi cho khách. Reply-To = VHD. */
  async sendContactConfirmation(contact: ContactMailPayload): Promise<void> {
    await this.refreshMailConfig();
    const { subject, html, text } = this.buildContactConfirmation(contact);
    await this.send({
      to: contact.email,
      subject,
      html,
      text,
      replyTo: this.getFrom(),
      listUnsubscribe: `<mailto:${this.senderEmail()}?subject=Unsubscribe>`,
    });
  }

  /** Email mã OTP (xác minh email đăng ký / quên mật khẩu) — hạn 10 phút. */

  /** ── Đơn hàng mới → mail cho ADMIN_EMAIL (reply thẳng cho khách) ── */
  async sendOrderNotification(order: OrderMailPayload): Promise<void> {
    await this.refreshMailConfig();
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL trống — bỏ qua email thông báo đơn hàng');
      return;
    }
    const { subject, html, text } = this.buildOrderMail(order, 'admin');
    await this.send({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: this.formatReplyTo(order.name, order.email),
    });
  }

  /** ── Xác nhận đã nhận đơn → mail cho khách ── */
  async sendOrderConfirmation(order: OrderMailPayload): Promise<void> {
    await this.refreshMailConfig();
    const { subject, html, text } = this.buildOrderMail(order, 'customer');
    await this.send({ to: order.email, subject, html, text });
  }

  private buildOrderMail(
    order: OrderMailPayload,
    audience: 'admin' | 'customer',
  ): RenderedMail {
    const vnd = (v: unknown) => `${Number(v).toLocaleString('vi-VN')}đ`;
    const rows = order.items
      .map(
        (i) => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e9f2;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.text};">${i.name}</td>
          <td align="center" style="padding:8px 12px;border-bottom:1px solid #e5e9f2;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.text};">×${i.qty}</td>
          <td align="right" style="padding:8px 12px;border-bottom:1px solid #e5e9f2;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.text};">${vnd(Number(i.price) * i.qty)}</td>
        </tr>`,
      )
      .join('');
    const totals = `
      <tr><td colspan="2" align="right" style="padding:8px 12px;font-family:Arial;font-size:14px;color:${BRAND.text};">Tạm tính</td><td align="right" style="padding:8px 12px;font-family:Arial;font-size:14px;">${vnd(order.subtotal)}</td></tr>
      ${Number(order.discount) > 0 ? `<tr><td colspan="2" align="right" style="padding:8px 12px;font-family:Arial;font-size:14px;color:${BRAND.text};">Giảm giá${order.voucherCode ? ` (${order.voucherCode})` : ''}</td><td align="right" style="padding:8px 12px;font-family:Arial;font-size:14px;color:${BRAND.red};">-${vnd(order.discount)}</td></tr>` : ''}
      <tr><td colspan="2" align="right" style="padding:10px 12px;font-family:Arial;font-size:15px;font-weight:bold;color:${BRAND.blue};">TỔNG CỘNG</td><td align="right" style="padding:10px 12px;font-family:Arial;font-size:16px;font-weight:bold;color:${BRAND.blue};">${vnd(order.total)}</td></tr>`;
    const info = `
      <p style="margin:0 0 4px;font-family:Arial;font-size:14px;color:${BRAND.text};"><b>Khách hàng:</b> ${order.name} — ${order.phone}</p>
      <p style="margin:0 0 4px;font-family:Arial;font-size:14px;color:${BRAND.text};"><b>Email:</b> ${order.email}</p>
      <p style="margin:0 0 4px;font-family:Arial;font-size:14px;color:${BRAND.text};"><b>Địa chỉ nhận:</b> ${order.address}</p>
      ${order.note ? `<p style="margin:0 0 4px;font-family:Arial;font-size:14px;color:${BRAND.text};"><b>Ghi chú:</b> ${order.note}</p>` : ''}`;
    const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e9f2;border-radius:8px;overflow:hidden;">
        <tr style="background:${BRAND.blue};">
          <td style="padding:10px 12px;font-family:Arial;font-size:13px;color:#fff;font-weight:bold;">Sản phẩm</td>
          <td align="center" style="padding:10px 12px;font-family:Arial;font-size:13px;color:#fff;font-weight:bold;">SL</td>
          <td align="right" style="padding:10px 12px;font-family:Arial;font-size:13px;color:#fff;font-weight:bold;">Thành tiền</td>
        </tr>${rows}${totals}</table>`;

    const isAdmin = audience === 'admin';
    const ovOrder = this.tplOverride(isAdmin ? 'orderNotify' : 'orderConfirm');
    const orderTokens = {
      name: order.name,
      code: order.code,
      total: vnd(order.total),
      siteName: this.mailSiteName(),
    };
    const subject = ovOrder.subject?.trim()
      ? this.fillTokens(ovOrder.subject, orderTokens)
      : isAdmin
        ? `🛒 Đơn hàng mới ${order.code} — ${vnd(order.total)} từ ${order.name}`
        : `${this.mailSiteName()} đã nhận đơn hàng ${order.code} của bạn`;
    const heading = isAdmin
      ? `Đơn hàng mới ${order.code}`
      : 'Cảm ơn bạn đã đặt hàng!';
    const intro = ovOrder.intro?.trim()
      ? this.fillTokens(this.escape(ovOrder.intro), orderTokens)
      : isAdmin
        ? 'Khách vừa đặt đơn trên website — liên hệ lại để xác nhận và chốt giao hàng.'
        : `Đơn hàng <b>${order.code}</b> của bạn đã được ghi nhận. ${this.mailSiteName()} sẽ liên hệ qua điện thoại/email để xác nhận và giao hàng (đơn hàng KHÔNG cần thanh toán online).`;
    const html = this.wrapLayout({
      preheader: subject,
      contentHtml: `<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;color:${BRAND.blue};">${heading}</h1><p style="margin:0 0 12px;font-family:Arial;font-size:15px;color:${BRAND.text};">${intro}</p>${info}${table}`,
      autoReplyNote: !isAdmin,
    });
    const text = [
      heading,
      `Khách: ${order.name} — ${order.phone} — ${order.email}`,
      `Địa chỉ: ${order.address}`,
      ...order.items.map(
        (i) => `- ${i.name} x${i.qty} = ${vnd(Number(i.price) * i.qty)}`,
      ),
      `Tổng: ${vnd(order.total)}`,
    ].join('\n');
    return { subject, html, text };
  }

  async sendOtpEmail(
    to: string,
    name: string,
    code: string,
    purpose: 'verify' | 'reset',
  ): Promise<void> {
    await this.refreshMailConfig();
    const isVerify = purpose === 'verify';
    const subject = isVerify
      ? `${code} là mã xác minh email VHD Corp của bạn`
      : `${code} là mã đặt lại mật khẩu VHD Corp của bạn`;
    const title = isVerify ? 'Xác minh email của bạn' : 'Đặt lại mật khẩu';
    const intro = isVerify
      ? `Chào ${name || 'bạn'}, cảm ơn bạn đã đăng ký tài khoản VHD Corp. Nhập mã bên dưới để hoàn tất xác minh email:`
      : `Chào ${name || 'bạn'}, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhập mã bên dưới để tiếp tục:`;

    const contentHtml = `
      <h1 class="h1" style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.blue};">${title}</h1>
      <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">${intro}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 8px;">
        <tr>
          <td style="background:${BRAND.blue};border-radius:12px;padding:16px 32px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:800;letter-spacing:10px;color:#ffffff;">${code}</span>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.muted};">Mã có hiệu lực trong <b>10 phút</b>. Nếu bạn không yêu cầu, hãy bỏ qua email này — tài khoản của bạn vẫn an toàn.</p>`;

    const html = this.wrapLayout({
      preheader: `${code} — ${title} (hiệu lực 10 phút)`,
      contentHtml,
      autoReplyNote: true,
    });
    const text = [
      'VHD CORP',
      '========',
      '',
      title.toUpperCase(),
      '',
      intro,
      '',
      `MÃ CỦA BẠN: ${code}`,
      '',
      'Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.',
    ].join('\n');

    await this.send({ to, subject, html, text, replyTo: this.getFrom() });
  }

  /**
   * Admin gửi email tùy chỉnh tới 1 user — nội dung HTML tự soạn (đã thay {{name}}),
   * bọc trong layout brand chuẩn (header/footer VHD).
   */
  async sendCustomEmail(
    to: string,
    subject: string,
    bodyHtml: string,
  ): Promise<void> {
    await this.refreshMailConfig();
    // Nội dung soạn từ Tiptap (không inline style) → bọc style base brand cho h1/p/ul
    const styled = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.text};">
      <style>
        .vhd-body h1{color:${BRAND.blue};font-size:22px;margin:0 0 12px;font-weight:800;}
        .vhd-body h2{color:${BRAND.blue};font-size:18px;margin:16px 0 8px;font-weight:700;}
        .vhd-body p{margin:0 0 12px;}
        .vhd-body ul,.vhd-body ol{margin:0 0 12px 20px;padding:0;}
        .vhd-body li{margin:4px 0;}
        .vhd-body a{color:${BRAND.blue};}
        .vhd-body img{max-width:100%;border-radius:8px;}
      </style>
      <div class="vhd-body">${bodyHtml}</div>
    </div>`;
    const html = this.wrapLayout({
      preheader: subject,
      contentHtml: styled,
      autoReplyNote: false,
    });
    // Bản text thô: bỏ tag HTML
    const text = bodyHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    await this.send({
      to,
      subject,
      html,
      text,
      replyTo: this.getFrom(),
      listUnsubscribe: `<mailto:${this.senderEmail()}?subject=Unsubscribe>`,
    });
  }

  // ───────────────────────── Renderers ─────────────────────────

  /** Dựng email admin (subject/html/text) — không gửi, tiện cho preview/test. */
  buildContactNotification(contact: ContactMailPayload): RenderedMail {
    const ov = this.tplOverride('contactNotify');
    const tokens = { name: contact.name, siteName: this.mailSiteName() };
    const subject = ov.subject?.trim()
      ? this.fillTokens(ov.subject, tokens)
      : contact.subject
        ? `Liên hệ mới từ ${contact.name} – ${contact.subject}`
        : `Liên hệ mới từ ${contact.name}`;
    const adminUrl = this.adminContactsUrl();

    const contentHtml = `
      <h1 class="h1" style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.blue};">Liên hệ mới từ khách hàng</h1>
      <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">${ov.intro?.trim() ? this.fillTokens(this.escape(ov.intro), tokens) : `Bạn vừa nhận được một yêu cầu liên hệ mới gửi qua website ${this.mailSiteName()}. Chi tiết như bên dưới:`}</p>
      ${this.contactInfoTable(contact, true)}
      ${this.messageBlock(contact.message)}
      ${this.ctaButton(adminUrl, 'Xem trong trang quản trị')}
      <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.muted};">Mẹo: bạn có thể phản hồi khách hàng bằng cách trả lời (Reply) trực tiếp email này.</p>`;

    const html = this.wrapLayout({
      preheader: `Khách hàng ${contact.name} vừa gửi liên hệ mới qua website.`,
      contentHtml,
      autoReplyNote: false,
    });

    const text = [
      'VHD CORP — Kết nối giá trị – Hợp tác vững bền',
      '=============================================',
      '',
      'LIÊN HỆ MỚI TỪ KHÁCH HÀNG',
      '',
      'Bạn vừa nhận được một yêu cầu liên hệ mới gửi qua website VHD Corp.',
      '',
      this.contactTextLines(contact),
      '',
      `Xem trong trang quản trị: ${adminUrl}`,
      '',
      '—',
      '© 2026 VHD Corp',
    ].join('\n');

    return { subject, html, text };
  }

  /** Dựng email xác nhận cho khách (subject/html/text) — không gửi. */
  buildContactConfirmation(contact: ContactMailPayload): RenderedMail {
    const ov = this.tplOverride('contactConfirm');
    const tokens = { name: contact.name, siteName: this.mailSiteName() };
    const subject = ov.subject?.trim()
      ? this.fillTokens(ov.subject, tokens)
      : `${this.mailSiteName()} đã nhận được yêu cầu của bạn`;
    const orgHtml = this.orgContactHtml();
    const orgTextLines = this.orgContactTextLines();

    const contentHtml = `
      <h1 class="h1" style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.blue};">Cảm ơn bạn đã liên hệ với VHD Corp!</h1>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">Xin chào <strong>${this.escape(contact.name)}</strong>,</p>
      <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">${ov.intro?.trim() ? this.fillTokens(this.escape(ov.intro), tokens) : `Chúng tôi rất vui khi nhận được yêu cầu của bạn. Đội ngũ ${this.mailSiteName()} sẽ xem xét và phản hồi trong vòng <strong>24 giờ làm việc</strong>. Dưới đây là tóm tắt thông tin bạn đã gửi:`}</p>
      ${this.contactInfoTable(contact, false)}
      ${this.messageBlock(contact.message)}
      ${orgHtml}
      <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">Trân trọng,<br /><strong style="color:${BRAND.blue};">Đội ngũ VHD Corp</strong></p>`;

    const html = this.wrapLayout({
      preheader:
        'Chúng tôi đã nhận được yêu cầu của bạn và sẽ phản hồi trong vòng 24 giờ.',
      contentHtml,
      autoReplyNote: true,
    });

    const text = [
      'VHD CORP — Kết nối giá trị – Hợp tác vững bền',
      '=============================================',
      '',
      `Xin chào ${contact.name},`,
      '',
      'Cảm ơn bạn đã liên hệ với VHD Corp. Chúng tôi đã nhận được yêu cầu của bạn và sẽ phản hồi trong vòng 24 giờ làm việc.',
      '',
      'TÓM TẮT YÊU CẦU CỦA BẠN',
      this.contactTextLines(contact),
      '',
      ...orgTextLines,
      'Trân trọng,',
      'Đội ngũ VHD Corp',
      '',
      '—',
      'Đây là email tự động, vui lòng không trả lời trực tiếp email này.',
      '© 2026 VHD Corp',
    ].join('\n');

    return { subject, html, text };
  }

  // ───────────────────────── Transport ─────────────────────────

  /** Gửi email — nuốt mọi lỗi, chỉ log. Đính kèm header chống spam. */
  /** Địa chỉ công ty in ở footer email (giảm điểm spam, chuẩn bulk-sender) */
  /** Đọc SiteConfig PUBLISHED → value.mail (admin sửa trong Cài đặt site, Xuất bản là áp dụng) */
  private async refreshMailConfig(): Promise<void> {
    if (Date.now() - this.mailCfgAt < 60_000) return;
    try {
      const row = await this.prisma.siteConfig.findFirst({
        where: { key: 'main', status: 'PUBLISHED' },
        orderBy: { version: 'desc' },
        select: { value: true },
      });
      const value = row?.value as { mail?: MailConfig } | null;
      this.mailCfg = value?.mail ?? {};
    } catch {
      this.mailCfg = {}; // DB lỗi → dùng env fallback, không chặn gửi mail
    }
    this.mailCfgAt = Date.now();
  }

  /** Thay token {name} {code} {total} {siteName} trong subject/intro admin nhập */
  private fillTokens(tpl: string, tokens: Record<string, string>): string {
    return tpl.replace(/\{(\w+)\}/g, (m, k: string) => tokens[k] ?? m);
  }

  private tplOverride(
    key: 'contactNotify' | 'contactConfirm' | 'orderNotify' | 'orderConfirm',
  ): MailTemplateOverride {
    return this.mailCfg.templates?.[key] ?? {};
  }

  private mailSiteName(): string {
    return this.mailCfg.siteName?.trim() || 'VHD Corp';
  }

  private mailTagline(): string {
    return this.mailCfg.tagline?.trim() || 'Kết nối giá trị – Hợp tác vững bền';
  }

  private mailCopyright(): string {
    return (
      this.mailCfg.copyright?.trim() ||
      `© 2026 ${this.mailSiteName()}. Bảo lưu mọi quyền.`
    );
  }

  private companyAddress(): string {
    return (
      this.mailCfg.address?.trim() ||
      this.config.get<string>('MAIL_COMPANY_ADDRESS') ||
      'TP. Hồ Chí Minh, Việt Nam · Hotline: 1900 0000'
    );
  }

  /** URL logo tuyệt đối cho email (env MAIL_LOGO_URL — nên là link public/Cloudinary) */
  private logoUrl(): string {
    return (
      this.mailCfg.logoUrl?.trim() ||
      (this.config.get<string>('MAIL_LOGO_URL') ?? '')
    );
  }

  private async send(opts: SendOptions): Promise<void> {
    try {
      const from = this.getFrom();
      const domain = this.senderEmail().split('@')[1] || 'vhdcorp.vn';
      const headers: Record<string, string> = {
        'X-Entity-Ref-ID': randomUUID(),
      };
      if (opts.listUnsubscribe) {
        headers['List-Unsubscribe'] = opts.listUnsubscribe;
      }

      await this.transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text, // plain-text alternative — giảm nguy cơ spam
        replyTo: opts.replyTo,
        messageId: `<${randomUUID()}@${domain}>`,
        headers,
      });

      if (this.dryRun) {
        this.logger.log(`[MAIL:DRY-RUN] to=${opts.to} subject=${opts.subject}`);
      } else {
        this.logger.log(`Đã gửi email tới ${opts.to}: ${opts.subject}`);
      }
    } catch (error) {
      this.logger.error(
        `Gửi email tới ${opts.to} thất bại: ${opts.subject}`,
        error,
      );
    }
  }

  // ───────────────────────── HTML building blocks ─────────────────────────

  /** Layout HTML đầy đủ: header brand + accent + card + footer. */
  private wrapLayout(o: {
    preheader: string;
    contentHtml: string;
    autoReplyNote: boolean;
  }): string {
    const autoNote = o.autoReplyNote
      ? `<div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#9aa3b2;">Đây là email tự động, vui lòng không trả lời trực tiếp email này.</div>`
      : '';

    return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>VHD Corp</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    body{margin:0!important;padding:0!important;width:100%!important;background-color:${BRAND.pageBg};}
    a{color:${BRAND.blue};}
    @media only screen and (max-width:600px){
      .email-container{width:100%!important;}
      .p-32{padding-left:20px!important;padding-right:20px!important;}
      .h1{font-size:20px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.pageBg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.pageBg};opacity:0;">${this.escape(o.preheader)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${BRAND.card};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(27,58,140,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND.blue};background:linear-gradient(135deg,${BRAND.blue} 0%,${BRAND.blueDark} 100%);padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                ${this.logoUrl() ? `<td style="padding-right:14px;vertical-align:middle;"><img src="${this.logoUrl()}" alt="VHD Corp" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:12px;background:#ffffff;padding:4px;" /></td>` : ''}
                <td style="vertical-align:middle;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:800;letter-spacing:0.5px;color:#ffffff;">${this.mailSiteName()}</div>
                  <div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.3px;color:#c3cfeb;">${this.mailTagline()}</div>
                </td>
              </tr></table>
            </td>
          </tr>
          <!-- Accent stripe -->
          <tr>
            <td style="padding:0;font-size:0;line-height:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="62%" height="4" style="height:4px;background-color:${BRAND.gold};font-size:0;line-height:0;">&nbsp;</td>
                  <td width="38%" height="4" style="height:4px;background-color:${BRAND.red};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="p-32" style="padding:32px;">${o.contentHtml}</td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND.softBg};border-top:1px solid ${BRAND.border};padding:22px 32px;text-align:center;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${BRAND.blue};">${this.mailSiteName()}</div>
              <div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.footMuted};">${this.mailTagline()}</div>
              <div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.footMuted};">${this.companyAddress()}</div>
              ${this.mailCfg.footerNote?.trim() ? `<div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.footMuted};">${this.mailCfg.footerNote.trim()}</div>` : ''}
              ${autoNote}
              <div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aeb6c4;">${this.mailCopyright()}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /** Bảng thông tin liên hệ (không gồm nội dung message). */
  private contactInfoTable(
    contact: ContactMailPayload,
    linkContacts: boolean,
  ): string {
    const emailVal = linkContacts
      ? `<a href="mailto:${this.escape(contact.email)}" style="color:${BRAND.blue};text-decoration:none;">${this.escape(contact.email)}</a>`
      : this.escape(contact.email);

    const phoneRaw = contact.phone?.trim();
    let phoneVal = '—';
    if (phoneRaw) {
      phoneVal = linkContacts
        ? `<a href="tel:${this.escape(phoneRaw.replace(/[^\d+]/g, ''))}" style="color:${BRAND.blue};text-decoration:none;">${this.escape(phoneRaw)}</a>`
        : this.escape(phoneRaw);
    }

    const rows: Array<[string, string]> = [
      ['Họ tên', this.escape(contact.name)],
      ['Email', emailVal],
      ['Số điện thoại', phoneVal],
      ['Tiêu đề', contact.subject ? this.escape(contact.subject) : '—'],
    ];

    const tr = rows
      .map(
        ([label, value]) => `
        <tr>
          <td style="padding:11px 14px;background-color:${BRAND.softBg};border:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${BRAND.blue};white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:11px 14px;border:1px solid ${BRAND.border};border-left:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.text};vertical-align:top;word-break:break-word;">${value}</td>
        </tr>`,
      )
      .join('');

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;margin:0 0 20px;">${tr}</table>`;
  }

  /** Khối nội dung message — nền xám nhạt, viền trái brand, giữ xuống dòng. */
  private messageBlock(message: string): string {
    return `
      <div style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.blue};">Nội dung</div>
      <div style="background-color:${BRAND.softBg};border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.blue};border-radius:6px;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.text};word-break:break-word;">${this.nl2br(this.escape(message))}</div>`;
  }

  /** Nút CTA bulletproof (table-based) — hiển thị ổn trên mọi email client. */
  private ctaButton(url: string, label: string): string {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr>
          <td align="center" bgcolor="${BRAND.blue}" style="border-radius:8px;">
            <a href="${this.escape(url)}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${label} &rarr;</a>
          </td>
        </tr>
      </table>`;
  }

  /** Khối thông tin liên hệ VHD cho email khách — chỉ hiện khi có env. */
  private orgContactHtml(): string {
    const hotline = this.config.get<string>('CONTACT_HOTLINE')?.trim();
    const email = this.config.get<string>('CONTACT_EMAIL')?.trim();
    if (!hotline && !email) return '';

    const lines: string[] = [];
    if (hotline) {
      lines.push(
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.text};">Hotline: <a href="tel:${this.escape(hotline.replace(/[^\d+]/g, ''))}" style="color:${BRAND.blue};text-decoration:none;font-weight:bold;">${this.escape(hotline)}</a></div>`,
      );
    }
    if (email) {
      lines.push(
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.text};">Email: <a href="mailto:${this.escape(email)}" style="color:${BRAND.blue};text-decoration:none;font-weight:bold;">${this.escape(email)}</a></div>`,
      );
    }

    return `
      <div style="margin:20px 0 0;padding:16px 18px;background-color:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:6px;">
        <div style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.blue};">Cần hỗ trợ ngay?</div>
        ${lines.join('')}
      </div>`;
  }

  // ───────────────────────── Plain-text building blocks ─────────────────────────

  /** Các dòng thông tin liên hệ cho bản plain-text. */
  private contactTextLines(contact: ContactMailPayload): string {
    return [
      `Họ tên: ${contact.name}`,
      `Email: ${contact.email}`,
      `Số điện thoại: ${contact.phone?.trim() || '—'}`,
      `Tiêu đề: ${contact.subject?.trim() || '—'}`,
      '',
      'Nội dung:',
      contact.message,
    ].join('\n');
  }

  /** Dòng thông tin liên hệ VHD cho bản plain-text — rỗng nếu không có env. */
  private orgContactTextLines(): string[] {
    const hotline = this.config.get<string>('CONTACT_HOTLINE')?.trim();
    const email = this.config.get<string>('CONTACT_EMAIL')?.trim();
    const lines: string[] = [];
    if (hotline) lines.push(`Hotline: ${hotline}`);
    if (email) lines.push(`Email: ${email}`);
    if (lines.length) lines.push('');
    return lines;
  }

  // ───────────────────────── Helpers ─────────────────────────

  /** Địa chỉ "From" đã cấu hình (đúng domain đã auth để SPF/DKIM pass). */
  private getFrom(): string {
    return (
      this.config.get<string>('MAIL_FROM') || 'VHD Corp <no-reply@vhdcorp.vn>'
    );
  }

  /** Email thô của người gửi (dùng cho messageId/List-Unsubscribe). */
  private senderEmail(): string {
    const user = this.config.get<string>('SMTP_USER');
    if (user) return user.trim();
    const match = this.getFrom().match(/<([^>]+)>/);
    return match ? match[1] : 'no-reply@vhdcorp.vn';
  }

  /** Reply-To dạng "Tên <email>" cho email khách gửi tới. */
  private formatReplyTo(name: string, email: string): string {
    const clean = name.replace(/["<>]/g, '').trim();
    return clean ? `"${clean}" <${email}>` : email;
  }

  /** URL trang quản trị liên hệ (FRONTEND_URL nếu có, fallback localhost:3001). */
  private adminContactsUrl(): string {
    const base =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    return `${base.replace(/\/+$/, '')}/admin/contacts`;
  }

  /** Chuyển xuống dòng thành <br /> (dùng SAU khi đã escape). */
  private nl2br(escaped: string): string {
    return escaped.replace(/\r\n|\r|\n/g, '<br />');
  }

  /** Escape HTML từ input người dùng để tránh injection vào email. */
  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
