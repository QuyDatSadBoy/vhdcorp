import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private config: ConfigService) {
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

  // ───────────────────────── Renderers ─────────────────────────

  /** Dựng email admin (subject/html/text) — không gửi, tiện cho preview/test. */
  buildContactNotification(contact: ContactMailPayload): RenderedMail {
    const subject = contact.subject
      ? `Liên hệ mới từ ${contact.name} – ${contact.subject}`
      : `Liên hệ mới từ ${contact.name}`;
    const adminUrl = this.adminContactsUrl();

    const contentHtml = `
      <h1 class="h1" style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.blue};">Liên hệ mới từ khách hàng</h1>
      <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">Bạn vừa nhận được một yêu cầu liên hệ mới gửi qua website VHD Corp. Chi tiết như bên dưới:</p>
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
    const subject = 'VHD Corp đã nhận được yêu cầu của bạn';
    const orgHtml = this.orgContactHtml();
    const orgTextLines = this.orgContactTextLines();

    const contentHtml = `
      <h1 class="h1" style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND.blue};">Cảm ơn bạn đã liên hệ với VHD Corp!</h1>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">Xin chào <strong>${this.escape(contact.name)}</strong>,</p>
      <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">Chúng tôi rất vui khi nhận được yêu cầu của bạn. Đội ngũ VHD Corp sẽ xem xét và phản hồi trong vòng <strong>24 giờ làm việc</strong>. Dưới đây là tóm tắt thông tin bạn đã gửi:</p>
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
            <td style="background-color:${BRAND.blue};background:linear-gradient(135deg,${BRAND.blue} 0%,${BRAND.blueDark} 100%);padding:28px 32px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:800;letter-spacing:0.5px;color:#ffffff;">VHD&nbsp;<span style="color:${BRAND.gold};">Corp</span></div>
              <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.3px;color:#c3cfeb;">Kết nối giá trị – Hợp tác vững bền</div>
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
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${BRAND.blue};">VHD Corp</div>
              <div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.footMuted};">Kết nối giá trị – Hợp tác vững bền</div>
              ${autoNote}
              <div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aeb6c4;">© 2026 VHD Corp. Bảo lưu mọi quyền.</div>
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
