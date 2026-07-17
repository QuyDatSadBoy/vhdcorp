"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadToCloudinary } from "@/services/media.service";
import type { Section } from "@/types/site-config";

/* ─── Nhãn tiếng Việt cho field — admin không cần hiểu tên kỹ thuật ─── */
const FIELD_LABELS: Record<string, string> = {
  heading: "Tiêu đề",
  subheading: "Mô tả phụ",
  eyebrow: "Nhãn nhỏ phía trên",
  body: "Nội dung",
  ctaText: "Chữ trên nút",
  ctaLink: "Link của nút",
  bgImage: "Ảnh nền (URL)",
  overlayOpacity: "Độ mờ lớp phủ (0–1)",
  align: "Căn lề",
  minHeight: "Chiều cao tối thiểu (px)",
  videoUrl: "Video (URL)",
  videoThumbnail: "Ảnh bìa video (URL)",
  thumbnailUrl: "Ảnh bìa (URL)",
  limit: "Số lượng hiển thị",
  layout: "Bố cục",
  columns: "Số cột",
  categoryIds: "ID danh mục (cách nhau dấu phẩy)",
  autoplay: "Tự chạy",
  interval: "Thời gian chuyển (ms)",
  source: "Nguồn slide",
  trustItems: "Chip cam kết dưới hero",
  headingSize: "Cỡ chữ tiêu đề (mức)",
  headingSizePx: "Cỡ chữ tiêu đề (px, 0 = tự động)",
  headingLineHeight: "Giãn dòng tiêu đề (vd 1.15)",
  headingLetterSpacing: "Giãn cách chữ tiêu đề (px)",
  headingColor: "Màu chữ tiêu đề",
  highlightColor: "Màu từ nhấn (bọc *từ* hoặc *cụm từ*)",
  subheadingSizePx: "Cỡ chữ mô tả (px, 0 = tự động)",
  subheadingColor: "Màu chữ mô tả",
  textColor: "Màu chữ nội dung",
  marginTop: "Khoảng cách ngoài — trên (px)",
  marginBottom: "Khoảng cách ngoài — dưới (px)",
  paddingTop: "Khoảng đệm trong — trên (px)",
  paddingBottom: "Khoảng đệm trong — dưới (px)",
  animation: "Hiệu ứng xuất hiện",
  animationDelay: "Trễ hiệu ứng (ms)",
  bannerPosition: "Vị trí banner (trang Quản trị → Banner)",
  grayscale: "Icon trắng đen",
  speed: "Tốc độ chạy",
  bgColor: "Màu nền",
  tagFilter: "Lọc theo tag",
  imageSide: "Vị trí ảnh",
  badge: "Nhãn badge",
  bullets: "Gạch đầu dòng",
  columnHeaders: "Tiêu đề các cột",
  html: "Mã HTML",
  stats: "Các chỉ số",
  steps: "Các bước",
  cases: "Các mục",
  items: "Các mục",
  quotes: "Các đánh giá",
  slides: "Các slide",
  logos: "Các logo",
  rows: "Các hàng",
  // field con trong mục
  label: "Nhãn",
  value: "Giá trị",
  unit: "Đơn vị",
  title: "Tiêu đề",
  description: "Mô tả",
  question: "Câu hỏi",
  answer: "Câu trả lời",
  emoji: "Emoji",
  icon: "Icon",
  name: "Tên",
  role: "Chức vụ",
  company: "Công ty",
  quote: "Lời đánh giá",
  avatar: "Ảnh đại diện (URL)",
  image: "Ảnh (URL)",
  link: "Link",
  alt: "Mô tả ảnh (SEO)",
  caption: "Chú thích",
  href: "Link",
  values: "Giá trị các cột (ngăn cách |)",
  highlight: "Nổi bật",
  embed: "Bản đồ (dán iframe / link / địa chỉ)",
  url: "Link (dán URL)",
  height: "Chiều cao (px)",
  maxHeight: "Chiều cao tối đa (px)",
};

const labelOf = (k: string) => FIELD_LABELS[k] ?? k;

/* ─── Field dạng lựa chọn cố định ─── */
const ENUM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  headingSize: [
    { value: "sm", label: "Nhỏ" },
    { value: "md", label: "Vừa" },
    { value: "lg", label: "Lớn" },
    { value: "xl", label: "Rất lớn (mặc định)" },
  ],
  animation: [
    { value: "none", label: "Không hiệu ứng" },
    { value: "fade-up", label: "Trồi lên (fade-up)" },
    { value: "fade-in", label: "Hiện dần (fade-in)" },
    { value: "slide-left", label: "Trượt ngang (slide-left)" },
    { value: "zoom-in", label: "Phóng to (zoom-in)" },
  ],
  source: [
    { value: "manual", label: "Tự nhập slide bên dưới" },
    { value: "banners", label: "Lấy từ trang Quản trị → Banner" },
  ],
  align: [
    { value: "left", label: "Trái" },
    { value: "center", label: "Giữa" },
    { value: "right", label: "Phải" },
  ],
  imageSide: [
    { value: "left", label: "Ảnh bên trái" },
    { value: "right", label: "Ảnh bên phải" },
  ],
  layout: [
    { value: "grid", label: "Lưới" },
    { value: "carousel", label: "Carousel" },
    { value: "list", label: "Danh sách" },
  ],
};

const LONG_TEXT_KEYS = new Set(["subheading", "body", "description", "answer", "quote", "html"]);
// Mọi key mang ảnh đều có nút tải ảnh — kể cả logo/cover/photo/banner.
const IMAGE_KEY_RE = /image|thumbnail|avatar|logo|cover|photo|banner/i;
// "icon" khi giá trị là đường dẫn/URL → coi như ảnh (icon emoji giữ ô text)
const iconLooksLikeImage = (k: string, v: unknown) =>
  /icon/i.test(k) && typeof v === "string" && (v.startsWith("/") || v.startsWith("http"));

/* ─── Mẫu item mới cho từng loại danh sách ─── */
const ITEM_TEMPLATES: Record<string, Record<string, unknown>> = {
  stats: { label: "Chỉ số mới", value: 0, unit: "+" },
  steps: { title: "Bước mới", description: "" },
  cases: { emoji: "✨", title: "Mục mới", description: "" },
  "items:faq-accordion": { question: "Câu hỏi mới?", answer: "" },
  items: { icon: "", title: "Mục mới", description: "" },
  quotes: { name: "Khách hàng", role: "", company: "", quote: "" },
  slides: { image: "", title: "", caption: "", link: "", alt: "" },
  trustItems: { label: "", desc: "" },
  logos: { image: "", name: "", link: "" },
  rows: { label: "", values: [], highlight: false },
};

function newItemFor(sectionType: string, key: string, first?: unknown): Record<string, unknown> {
  const tpl = ITEM_TEMPLATES[`${key}:${sectionType}`] ?? ITEM_TEMPLATES[key];
  if (tpl) return structuredClone(tpl);
  // Không có mẫu → nhân bản shape của item đầu với giá trị rỗng
  if (first && typeof first === "object") {
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(first as Record<string, unknown>)) {
      clone[k] = typeof v === "number" ? 0 : typeof v === "boolean" ? false : Array.isArray(v) ? [] : "";
    }
    return clone;
  }
  return { title: "" };
}

/* ─── Nút tải ảnh nhỏ đặt cạnh input URL ảnh ─── */
function UploadButton({ onDone }: { onDone: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            setBusy(true);
            const m = await uploadToCloudinary(file, "sections");
            onDone(m.url);
            toast.success("Đã tải ảnh lên");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Tải ảnh thất bại");
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 shrink-0"
        title="Tải ảnh lên"
        aria-label="Tải ảnh lên"
        onClick={() => ref.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </Button>
    </>
  );
}

/* ─── Input cho 1 giá trị nguyên thủy (string/number/boolean) ─── */
function PrimitiveField({
  k,
  value,
  onChange,
  compact,
}: {
  k: string;
  value: unknown;
  onChange: (v: unknown) => void;
  compact?: boolean;
}) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{labelOf(k)}</Label>
        <Switch checked={value} onCheckedChange={(c) => onChange(c)} aria-label={labelOf(k)} />
      </div>
    );
  }
  if (typeof value === "number") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{labelOf(k)}</Label>
        <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    );
  }
  const str = String(value ?? "");
  if (ENUM_OPTIONS[k]) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{labelOf(k)}</Label>
        <Select value={str || undefined} onValueChange={(v) => onChange(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn…" />
          </SelectTrigger>
          <SelectContent>
            {ENUM_OPTIONS[k].map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (IMAGE_KEY_RE.test(k) || k === "bgImage" || iconLooksLikeImage(k, str)) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{labelOf(k)}</Label>
        <div className="flex gap-1.5">
          <Input value={str} placeholder="https://… hoặc bấm tải ảnh" onChange={(e) => onChange(e.target.value)} />
          <UploadButton onDone={(url) => onChange(url)} />
        </div>
      </div>
    );
  }
  // icon/emoji: gõ emoji HOẶC tải ảnh lên (FE tự render ảnh khi giá trị là URL)
  if (/^(icon|emoji)$/i.test(k)) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{labelOf(k)}</Label>
        <div className="flex gap-1.5">
          <Input value={str} placeholder="Emoji (🎯) hoặc bấm tải ảnh" onChange={(e) => onChange(e.target.value)} />
          <UploadButton onDone={(url) => onChange(url)} />
        </div>
      </div>
    );
  }
  if (LONG_TEXT_KEYS.has(k)) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{labelOf(k)}</Label>
        <Textarea rows={compact ? 2 : 3} value={str} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  // Key màu (headingColor/highlightColor/bgColor…) → có bảng chọn màu + ô hex, để trống = mặc định
  if (/color/i.test(k)) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{labelOf(k)}</Label>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            aria-label={labelOf(k)}
            value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#1B3A8C"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 shrink-0 cursor-pointer rounded border bg-transparent"
          />
          <Input value={str} placeholder="#hex — để trống dùng mặc định" onChange={(e) => onChange(e.target.value)} />
          {str && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Xóa
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{labelOf(k)}</Label>
      <Input value={str} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ─── Editor danh sách chuỗi (bullets, columnHeaders…) ─── */
function StringListEditor({ k, items, onChange }: { k: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{labelOf(k)}</Label>
      {items.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input value={s} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label="Xóa dòng"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="h-3 w-3" /> Thêm dòng
      </Button>
    </div>
  );
}

/* ─── Editor danh sách object (stats/steps/cases/quotes/slides/…) ─── */
function ObjectListEditor({
  sectionType,
  k,
  items,
  onChange,
}: {
  sectionType: string;
  k: string;
  items: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const patchItem = (i: number, key: string, v: unknown) =>
    onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));

  return (
    <div className="space-y-2">
      <Label className="text-xs">{labelOf(k)}</Label>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Mục {i + 1}</span>
            <div className="flex items-center">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                aria-label="Lên"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                aria-label="Xuống"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                aria-label="Xóa mục"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          </div>
          {Object.entries(item).map(([key, v]) => {
            // string[] lồng trong item (vd values của bảng so sánh) → nhập ngăn cách "|"
            if (Array.isArray(v) && (v.length === 0 || typeof v[0] === "string")) {
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{labelOf(key)}</Label>
                  <Input
                    value={(v as string[]).join(" | ")}
                    placeholder="Giá trị 1 | Giá trị 2 | …"
                    onChange={(e) =>
                      patchItem(
                        i,
                        key,
                        e.target.value
                          .split("|")
                          .map((s) => s.trim())
                          .filter((s, idx, arr) => s !== "" || idx < arr.length - 1)
                      )
                    }
                  />
                </div>
              );
            }
            return <PrimitiveField key={key} k={key} value={v} onChange={(nv) => patchItem(i, key, nv)} compact />;
          })}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        onClick={() => onChange([...items, newItemFor(sectionType, k, items[0])])}
      >
        <Plus className="h-3 w-3" /> Thêm mục
      </Button>
    </div>
  );
}

/**
 * SectionPropsEditor — form thuộc tính chuyên nghiệp cho Page Builder:
 * nhãn tiếng Việt, danh sách có nút thêm/xóa/sắp xếp (không bắt admin gõ JSON),
 * upload ảnh trực tiếp, lựa chọn cố định cho căn lề/bố cục.
 */
export default function SectionPropsEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const props = section.props as unknown as Record<string, unknown>;
  // Các key chung do khối "Khung, màu & hiệu ứng" bên dưới đảm nhiệm — không lặp ở danh sách tự động
  const fields = Object.keys(props).filter((k) => !COMMON_STYLE_KEYS.includes(k) && k !== "background");

  return (
    <div className="space-y-3.5">
      {fields.map((k) => {
        const v = props[k];
        if (Array.isArray(v)) {
          // number[] (categoryIds) → CSV
          if (v.length > 0 && typeof v[0] === "number") {
            return (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{labelOf(k)}</Label>
                <Input
                  value={(v as number[]).join(", ")}
                  placeholder="1, 2, 3"
                  onChange={(e) =>
                    onChange({
                      [k]: e.target.value
                        .split(",")
                        .map((s) => Number(s.trim()))
                        .filter((n) => !Number.isNaN(n)),
                    })
                  }
                />
              </div>
            );
          }
          if (v.length === 0 || typeof v[0] === "string") {
            // categoryIds rỗng vẫn nên là number[] — đoán theo tên field
            if (k === "categoryIds") {
              return (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{labelOf(k)}</Label>
                  <Input
                    value={(v as number[]).join(", ")}
                    placeholder="1, 2, 3"
                    onChange={(e) =>
                      onChange({
                        [k]: e.target.value
                          .split(",")
                          .map((s) => Number(s.trim()))
                          .filter((n) => !Number.isNaN(n)),
                      })
                    }
                  />
                </div>
              );
            }
            if (v.length === 0 && (k in ITEM_TEMPLATES || `${k}:${section.type}` in ITEM_TEMPLATES)) {
              // Danh sách object đang rỗng → hiện nút thêm mục đầu tiên
              return (
                <ObjectListEditor
                  key={k}
                  sectionType={section.type}
                  k={k}
                  items={[]}
                  onChange={(items) => onChange({ [k]: items })}
                />
              );
            }
            return (
              <StringListEditor key={k} k={k} items={v as string[]} onChange={(items) => onChange({ [k]: items })} />
            );
          }
          return (
            <ObjectListEditor
              key={k}
              sectionType={section.type}
              k={k}
              items={v as Record<string, unknown>[]}
              onChange={(items) => onChange({ [k]: items })}
            />
          );
        }
        if (v !== null && typeof v === "object") {
          // object lạ (hiếm) → JSON fallback
          return (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{labelOf(k)} (JSON)</Label>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                defaultValue={JSON.stringify(v, null, 2)}
                onChange={(e) => {
                  try {
                    onChange({ [k]: JSON.parse(e.target.value) });
                  } catch {
                    /* JSON dở dang khi đang gõ — bỏ qua */
                  }
                }}
              />
            </div>
          );
        }
        return <PrimitiveField key={k} k={k} value={v} onChange={(nv) => onChange({ [k]: nv })} />;
      })}

      <CommonStyleBlock props={props} onChange={onChange} />
    </div>
  );
}

/* ─── Khối "Khung, màu & hiệu ứng" — hiển thị cho MỌI section, kể cả khi props chưa có key ─── */
const COMMON_STYLE_KEYS = [
  "paddingTop",
  "paddingBottom",
  "marginTop",
  "marginBottom",
  "align",
  "bgColor",
  "headingColor",
  "textColor",
  "animation",
  "animationDelay",
];

function OptionalNumberField({
  k,
  value,
  onChange,
  step,
}: {
  k: string;
  value: unknown;
  onChange: (v: number | undefined) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{labelOf(k)}</Label>
      <Input
        type="number"
        step={step}
        placeholder="mặc định"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </div>
  );
}

function CommonStyleBlock({
  props,
  onChange,
}: {
  props: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Khung, màu & hiệu ứng (chung mọi khối)
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(["paddingTop", "paddingBottom", "marginTop", "marginBottom"] as const).map((k) => (
          <OptionalNumberField key={k} k={k} value={props[k]} onChange={(v) => onChange({ [k]: v })} />
        ))}
      </div>
      <PrimitiveField k="align" value={String(props.align ?? "")} onChange={(v) => onChange({ align: v })} />
      {(["bgColor", "headingColor", "textColor"] as const).map((k) => (
        <PrimitiveField key={k} k={k} value={String(props[k] ?? "")} onChange={(v) => onChange({ [k]: v })} />
      ))}
      <PrimitiveField
        k="animation"
        value={String(props.animation ?? "none")}
        onChange={(v) => onChange({ animation: v })}
      />
      <OptionalNumberField
        k="animationDelay"
        value={props.animationDelay}
        onChange={(v) => onChange({ animationDelay: v })}
      />
    </div>
  );
}
