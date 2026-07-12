"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, Rocket } from "lucide-react";
import { useDraftSiteConfig, useSaveDraftSiteConfig, usePublishSiteConfig } from "@/services/site-config.service";
import type { SiteConfigValue } from "@/types/site-config";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUploader from "@/components/admin/image-uploader";
import { useConfirm } from "@/components/admin/confirm-dialog";
import FooterColumnsEditor from "@/components/admin/footer-columns-editor";
import ContactChannelsEditor from "@/components/admin/contact-channels-editor";
import SiteConfigHistory from "@/components/admin/site-config-history";

/** Danh sách font gợi ý — font ngoài "Be Vietnam Pro"/"Inter" sẽ tự load qua Google Fonts. */
const FONT_OPTIONS = [
  "Be Vietnam Pro",
  "Inter",
  "Montserrat",
  "Roboto",
  "Open Sans",
  "Lora",
  "Playfair Display",
  "Nunito",
  "Source Sans 3",
  "Space Grotesk",
];

const SPACING_OPTIONS: { value: "compact" | "normal" | "spacious"; label: string }[] = [
  { value: "compact", label: "Gọn (compact)" },
  { value: "normal", label: "Bình thường (normal)" },
  { value: "spacious", label: "Thoáng (spacious)" },
];

export default function AdminSettingsPage() {
  const { data, isLoading } = useDraftSiteConfig();
  const saveDraft = useSaveDraftSiteConfig();
  const publish = usePublishSiteConfig();
  const confirm = useConfirm();

  const [draft, setDraft] = useState<SiteConfigValue | null>(null);
  // Chuỗi keywords thô (phân cách dấu phẩy) — giữ state riêng để không mất dấu phẩy đang gõ
  const [keywordsText, setKeywordsText] = useState("");

  useEffect(() => {
    if (data?.value) {
      const v = data.value;
      // Merge với DEFAULT để tránh undefined ở các nhánh nested (logo/favicon/...)
      setDraft({
        ...DEFAULT_SITE_CONFIG,
        ...v,
        brand: {
          ...DEFAULT_SITE_CONFIG.brand,
          ...(v.brand ?? {}),
          logo: { ...DEFAULT_SITE_CONFIG.brand.logo, ...(v.brand?.logo ?? {}) },
          favicon: { ...DEFAULT_SITE_CONFIG.brand.favicon, ...(v.brand?.favicon ?? {}) },
          ogDefaultImage: { ...DEFAULT_SITE_CONFIG.brand.ogDefaultImage, ...(v.brand?.ogDefaultImage ?? {}) },
        },
        header: { ...DEFAULT_SITE_CONFIG.header, ...(v.header ?? {}) },
        theme: {
          ...DEFAULT_SITE_CONFIG.theme,
          ...(v.theme ?? {}),
          colors: { ...DEFAULT_SITE_CONFIG.theme.colors, ...(v.theme?.colors ?? {}) },
          fonts: { ...DEFAULT_SITE_CONFIG.theme.fonts, ...(v.theme?.fonts ?? {}) },
        },
        seo: { ...DEFAULT_SITE_CONFIG.seo, ...(v.seo ?? {}) },
        navigation: v.navigation ?? DEFAULT_SITE_CONFIG.navigation,
        footer: {
          ...DEFAULT_SITE_CONFIG.footer,
          ...(v.footer ?? {}),
          contact: { ...DEFAULT_SITE_CONFIG.footer.contact, ...(v.footer?.contact ?? {}) },
        },
        pages: {
          home: v.pages?.home ?? { sections: [] },
          about: v.pages?.about ?? { sections: [] },
          contact: v.pages?.contact ?? { sections: [] },
        },
      });
      setKeywordsText((v.seo?.defaultKeywords ?? []).join(", "));
    }
  }, [data]);

  if (isLoading || !draft) return <p>Đang tải...</p>;

  function update<K extends keyof SiteConfigValue>(key: K, value: SiteConfigValue[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function handleSave() {
    if (!draft) return;
    try {
      await saveDraft.mutateAsync({ value: draft });
      toast.success("Đã lưu bản nháp");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    }
  }
  async function handlePublish() {
    const ok = await confirm({
      title: "Xuất bản cấu hình?",
      description:
        "Cấu hình hiện tại sẽ được áp dụng lên trang chính ngay lập tức. Khách truy cập sẽ thấy phiên bản mới.",
      confirmText: "Xuất bản",
    });
    if (!ok) return;
    try {
      await publish.mutateAsync("main");
      toast.success("Đã xuất bản");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xuất bản thất bại");
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Cài đặt website</h1>
          <p className="text-sm text-muted-foreground">Brand, theme, SEO, navigation, footer — toàn quyền tùy chỉnh</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saveDraft.isPending}>
            {saveDraft.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}{" "}
            Lưu nháp
          </Button>
          <Button onClick={handlePublish} disabled={publish.isPending}>
            {publish.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}{" "}
            Xuất bản
          </Button>
        </div>
      </motion.div>

      <Tabs defaultValue="brand">
        <TabsList>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="custom">Custom CSS</TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
        </TabsList>

        <TabsContent value="brand">
          <Card>
            <CardContent className="p-6 space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Tên website</Label>
                <Input
                  value={draft.brand.siteName}
                  onChange={(e) => update("brand", { ...draft.brand, siteName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slogan</Label>
                <Input
                  value={draft.brand.tagline}
                  onChange={(e) => update("brand", { ...draft.brand, tagline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUploader
                  value={draft.brand.logo.url}
                  onChange={(url) => update("brand", { ...draft.brand, logo: { ...draft.brand.logo, url } })}
                  folder="brand"
                  aspect="square"
                  allowUrlInput
                  label="logo"
                />
              </div>
              <div className="space-y-2">
                <Label>Favicon</Label>
                <ImageUploader
                  value={draft.brand.favicon.url}
                  onChange={(url) => update("brand", { ...draft.brand, favicon: { url } })}
                  folder="brand"
                  aspect="square"
                  allowUrlInput
                  label="favicon"
                  maxBytes={1024 * 1024}
                />
              </div>
              <div className="space-y-2">
                <Label>OG Image (mặc định khi chia sẻ social)</Label>
                <ImageUploader
                  value={draft.brand.ogDefaultImage.url}
                  onChange={(url) =>
                    update("brand", { ...draft.brand, ogDefaultImage: { ...draft.brand.ogDefaultImage, url } })
                  }
                  folder="brand"
                  aspect="video"
                  allowUrlInput
                  label="OG image"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="header">
          <Card>
            <CardContent className="p-6 space-y-4 max-w-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Hiện dòng promo</Label>
                  <p className="text-xs text-muted-foreground">Dải thông báo/khuyến mãi phía trên header</p>
                </div>
                <Switch
                  checked={!!draft.header?.showPromo}
                  onCheckedChange={(checked) => update("header", { ...(draft.header ?? {}), showPromo: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nội dung promo</Label>
                <Input
                  placeholder="VD: Miễn phí giao hàng cho đơn B2B trên 5 triệu"
                  value={draft.header?.promoText ?? ""}
                  onChange={(e) => update("header", { ...(draft.header ?? {}), promoText: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardContent className="p-6 space-y-4 max-w-xl">
              {(["primary", "accent", "highlight", "danger", "background", "surface", "text"] as const).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <Label className="w-32 capitalize">{k}</Label>
                  <Input
                    type="color"
                    className="h-10 w-16 p-1"
                    value={draft.theme.colors[k]}
                    onChange={(e) =>
                      update("theme", { ...draft.theme, colors: { ...draft.theme.colors, [k]: e.target.value } })
                    }
                  />
                  <Input
                    value={draft.theme.colors[k]}
                    onChange={(e) =>
                      update("theme", { ...draft.theme, colors: { ...draft.theme.colors, [k]: e.target.value } })
                    }
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Border radius (px, 0–24)</Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={draft.theme.borderRadius}
                  onChange={(e) => update("theme", { ...draft.theme, borderRadius: Number(e.target.value) })}
                />
              </div>
              {(["heading", "body"] as const).map((slot) => {
                const current = draft.theme.fonts[slot];
                const options = FONT_OPTIONS.includes(current) ? FONT_OPTIONS : [current, ...FONT_OPTIONS];
                return (
                  <div key={slot} className="space-y-2">
                    <Label>{slot === "heading" ? "Font tiêu đề" : "Font nội dung"}</Label>
                    <Select
                      value={current}
                      onValueChange={(value) =>
                        update("theme", { ...draft.theme, fonts: { ...draft.theme.fonts, [slot]: value } })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Font ngoài danh sách built-in (Be Vietnam Pro, Inter) sẽ tự động load qua Google Fonts.
              </p>
              <div className="space-y-2">
                <Label>Cỡ chữ gốc (px, 14–20)</Label>
                <Input
                  type="number"
                  min={14}
                  max={20}
                  value={draft.theme.fonts.baseFontSize}
                  onChange={(e) =>
                    update("theme", {
                      ...draft.theme,
                      fonts: { ...draft.theme.fonts, baseFontSize: Number(e.target.value) },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Scale toàn bộ kích thước chữ và khoảng cách theo rem.</p>
              </div>
              <div className="space-y-2">
                <Label>Mật độ khoảng cách</Label>
                <Select
                  value={draft.theme.spacing}
                  onValueChange={(value) =>
                    update("theme", { ...draft.theme, spacing: value as SiteConfigValue["theme"]["spacing"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPACING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardContent className="p-6 space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Title template (%s = title trang)</Label>
                <Input
                  value={draft.seo.titleTemplate}
                  onChange={(e) => update("seo", { ...draft.seo, titleTemplate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả mặc định</Label>
                <Textarea
                  rows={3}
                  value={draft.seo.defaultDescription}
                  onChange={(e) => update("seo", { ...draft.seo, defaultDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Từ khóa mặc định (phân cách bằng dấu phẩy)</Label>
                <Input
                  placeholder="nhựa công nghiệp, cao su, làng nghề Việt"
                  value={keywordsText}
                  onChange={(e) => {
                    setKeywordsText(e.target.value);
                    update("seo", {
                      ...draft.seo,
                      defaultKeywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>OG Image URL (SEO)</Label>
                <Input
                  placeholder="https://.../og-image.jpg"
                  value={draft.seo.ogImage ?? ""}
                  onChange={(e) => update("seo", { ...draft.seo, ogImage: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Kích thước khuyến nghị 1200x630px. Để trống sẽ dùng OG image mặc định ở tab Brand.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Google Analytics ID</Label>
                <Input
                  value={draft.seo.googleAnalyticsId ?? ""}
                  onChange={(e) => update("seo", { ...draft.seo, googleAnalyticsId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Google Tag Manager ID</Label>
                <Input
                  value={draft.seo.googleTagManagerId ?? ""}
                  onChange={(e) => update("seo", { ...draft.seo, googleTagManagerId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Facebook Pixel ID</Label>
                <Input
                  value={draft.seo.facebookPixelId ?? ""}
                  onChange={(e) => update("seo", { ...draft.seo, facebookPixelId: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="navigation">
          <Card>
            <CardContent className="p-6 space-y-3 max-w-2xl">
              {draft.navigation.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 items-center">
                  <Input
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => {
                      const next = [...draft.navigation];
                      next[idx] = { ...item, label: e.target.value };
                      update("navigation", next);
                    }}
                  />
                  <Input
                    placeholder="/href"
                    value={item.href}
                    onChange={(e) => {
                      const next = [...draft.navigation];
                      next[idx] = { ...item, href: e.target.value };
                      update("navigation", next);
                    }}
                  />
                  <Input
                    type="number"
                    value={item.order}
                    onChange={(e) => {
                      const next = [...draft.navigation];
                      next[idx] = { ...item, order: Number(e.target.value) };
                      update("navigation", next);
                    }}
                  />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update(
                        "navigation",
                        draft.navigation.filter((_, i) => i !== idx)
                      )
                    }
                  >
                    Xóa
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  update("navigation", [
                    ...draft.navigation,
                    { id: `nav-${Date.now()}`, label: "Mới", href: "/", order: draft.navigation.length + 1 },
                  ])
                }
              >
                + Thêm mục
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardContent className="p-6 space-y-4 max-w-2xl">
              <div className="space-y-2">
                <Label>Copyright</Label>
                <Input
                  value={draft.footer.copyright}
                  onChange={(e) => update("footer", { ...draft.footer, copyright: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả công ty (cột đầu footer)</Label>
                <Textarea
                  rows={3}
                  placeholder="Giới thiệu ngắn về công ty hiển thị ở footer"
                  value={draft.footer.description ?? ""}
                  onChange={(e) => update("footer", { ...draft.footer, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Hiện bản đồ</Label>
                  <p className="text-xs text-muted-foreground">Hiển thị bản đồ vị trí công ty ở footer</p>
                </div>
                <Switch
                  checked={!!draft.footer.showMap}
                  onCheckedChange={(checked) => update("footer", { ...draft.footer, showMap: checked })}
                />
              </div>

              {/* Thông tin liên hệ — hiển thị footer + floating widget */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-base font-semibold">Thông tin liên hệ</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Bật floating widget (FB Messenger / Zalo / Hotline)
                    </span>
                    <Switch
                      checked={!!draft.footer.contact?.floatingWidget}
                      onCheckedChange={(checked) =>
                        update("footer", {
                          ...draft.footer,
                          contact: { ...(draft.footer.contact ?? {}), floatingWidget: checked },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      placeholder="contact@vhdcorp.vn"
                      value={draft.footer.contact?.email ?? ""}
                      onChange={(e) =>
                        update("footer", {
                          ...draft.footer,
                          contact: { ...(draft.footer.contact ?? {}), email: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hotline</Label>
                    <Input
                      placeholder="1900 1234"
                      value={draft.footer.contact?.hotline ?? ""}
                      onChange={(e) =>
                        update("footer", {
                          ...draft.footer,
                          contact: { ...(draft.footer.contact ?? {}), hotline: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Số điện thoại khác</Label>
                    <Input
                      placeholder="+84 28 ..."
                      value={draft.footer.contact?.phone ?? ""}
                      onChange={(e) =>
                        update("footer", {
                          ...draft.footer,
                          contact: { ...(draft.footer.contact ?? {}), phone: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Địa chỉ</Label>
                    <Input
                      placeholder="TP. Hồ Chí Minh"
                      value={draft.footer.contact?.address ?? ""}
                      onChange={(e) =>
                        update("footer", {
                          ...draft.footer,
                          contact: { ...(draft.footer.contact ?? {}), address: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Messenger URL</Label>
                    <Input
                      placeholder="https://m.me/vhdcorp"
                      value={draft.footer.contact?.messengerUrl ?? ""}
                      onChange={(e) =>
                        update("footer", {
                          ...draft.footer,
                          contact: { ...(draft.footer.contact ?? {}), messengerUrl: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Zalo URL</Label>
                    <Input
                      placeholder="https://zalo.me/0901234567"
                      value={draft.footer.contact?.zaloUrl ?? ""}
                      onChange={(e) =>
                        update("footer", {
                          ...draft.footer,
                          contact: { ...(draft.footer.contact ?? {}), zaloUrl: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                {/* Kênh liên hệ nổi tùy chỉnh 100% — Facebook/Zalo/TikTok/… icon + nhãn + link */}
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-sm font-semibold">Kênh nút liên hệ nổi (góc phải màn hình)</Label>
                  <p className="text-xs text-muted-foreground">
                    Thêm bao nhiêu kênh tùy ý: Facebook, Zalo, TikTok, YouTube… mỗi kênh gồm icon + nhãn + link. Nhập số
                    điện thoại sẽ tự thành nút gọi, nhập email tự thành nút gửi mail. Để trống danh sách → widget tự
                    dùng Messenger/Zalo/Hotline/Email phía trên.
                  </p>
                  <ContactChannelsEditor
                    channels={draft.footer.contact?.channels ?? []}
                    onChange={(channels) =>
                      update("footer", {
                        ...draft.footer,
                        contact: { ...(draft.footer.contact ?? {}), channels },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Mạng xã hội</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Hỗ trợ icon: facebook, youtube, instagram, zalo, linkedin, tiktok, telegram, whatsapp, phone, email
                </p>
                <div className="mt-2 space-y-2">
                  {draft.footer.social.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-[140px_1fr_auto] gap-2">
                      <Input
                        placeholder="platform"
                        value={s.platform}
                        onChange={(e) => {
                          const next = [...draft.footer.social];
                          next[idx] = { ...s, platform: e.target.value };
                          update("footer", { ...draft.footer, social: next });
                        }}
                      />
                      <Input
                        placeholder="url"
                        value={s.url}
                        onChange={(e) => {
                          const next = [...draft.footer.social];
                          next[idx] = { ...s, url: e.target.value };
                          update("footer", { ...draft.footer, social: next });
                        }}
                      />
                      <Button
                        variant="ghost"
                        onClick={() =>
                          update("footer", { ...draft.footer, social: draft.footer.social.filter((_, i) => i !== idx) })
                        }
                      >
                        Xóa
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      update("footer", {
                        ...draft.footer,
                        social: [...draft.footer.social, { platform: "facebook", url: "" }],
                      })
                    }
                  >
                    + Thêm
                  </Button>
                </div>
              </div>

              <div>
                <Label>Cột link footer</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Các cột link hiển thị ở footer (VD: Về chúng tôi, Sản phẩm, Hỗ trợ)
                </p>
                <FooterColumnsEditor
                  columns={draft.footer.columns}
                  onChange={(columns) => update("footer", { ...draft.footer, columns })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardContent className="p-6 max-w-3xl">
              <Label>Custom CSS (sẽ inject vào trang)</Label>
              <Textarea
                rows={14}
                className="font-mono text-xs mt-2"
                value={draft.customCss ?? ""}
                onChange={(e) => update("customCss", e.target.value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-6 max-w-3xl">
              <p className="text-sm text-muted-foreground mb-4">
                Các phiên bản cấu hình đã lưu. Khôi phục sẽ ghi đè bản nháp hiện tại — bấm Xuất bản để áp dụng lên trang
                chính.
              </p>
              <SiteConfigHistory />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
