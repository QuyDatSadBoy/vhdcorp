"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Rocket,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Undo2,
  Redo2,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  CopyPlus,
  GripVertical,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDraftSiteConfig, useSaveDraftSiteConfig, usePublishSiteConfig } from "@/services/site-config.service";
import type { Section, SiteConfigValue } from "@/types/site-config";
import {
  defaultAboutSections,
  defaultContactSections,
  defaultHomeSections,
  defaultListingSections,
} from "@/lib/default-sections";
// Nội dung mặc định của từng loại section — template "Thêm section" seed đủ 100% thuộc tính
import { DEFAULT_COMPARISON_COLUMNS, DEFAULT_COMPARISON_ROWS } from "@/components/sections/comparison-table";
import { DEFAULT_FAQ_ITEMS } from "@/components/sections/faq-accordion";
import { DEFAULT_HERO_TRUST_ITEMS } from "@/components/sections/hero";
import { DEFAULT_INDUSTRY_ITEMS } from "@/components/sections/industries";
import { DEFAULT_PROCESS_STEPS } from "@/components/sections/process";
import { DEFAULT_STORY_STEPS } from "@/components/sections/sticky-story";
import { DEFAULT_USE_CASES } from "@/components/sections/use-cases";
import ImageUploader from "@/components/admin/image-uploader";
import SectionPropsEditor from "@/components/admin/section-props-editor";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { PageRenderer } from "@/components/sections";
import { useSiteConfigStore } from "@/store/site-config.store";
// UI thật của các trang — preview builder render Y HỆT client (cùng component, cùng config)
import ProductsPageClient from "@/app/(client)/products/_components/products-page-client";
import PostsPageClient from "@/app/(client)/posts/_components/posts-page-client";
import ContactForm from "@/app/(client)/contact/_components/contact-form";
import ClientHeader from "@/components/client/header";
import ClientFooter from "@/components/client/footer";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SECTION_TEMPLATES: Record<Section["type"], () => Section> = {
  hero: () => ({
    id: `hero-${Date.now()}`,
    type: "hero",
    order: 0,
    visible: true,
    props: {
      heading: "Tiêu đề",
      subheading: "Phụ đề",
      ctaText: "Khám phá",
      ctaLink: "/products",
      align: "center",
      minHeight: 600,
      bgImage: "",
      overlayOpacity: 0.55,
      videoUrl: "",
      videoThumbnail: "",
      badge: "B2B",
      trustItems: DEFAULT_HERO_TRUST_ITEMS,
      headingSize: "xl" as const,
      headingSizePx: 0,
      headingLineHeight: 1.15,
      headingLetterSpacing: 0,
      headingColor: "",
      highlightColor: "",
      subheadingSizePx: 0,
      subheadingColor: "",
    },
  }),
  "featured-products": () => ({
    id: `fp-${Date.now()}`,
    type: "featured-products",
    order: 0,
    visible: true,
    props: { heading: "Sản phẩm nổi bật", limit: 8, layout: "grid", categoryId: 0 },
  }),
  "category-grid": () => ({
    id: `cg-${Date.now()}`,
    type: "category-grid",
    order: 0,
    visible: true,
    props: { heading: "Danh mục", categoryIds: [], columns: 4 },
  }),
  "banner-slider": () => ({
    id: `bs-${Date.now()}`,
    type: "banner-slider",
    order: 0,
    visible: true,
    props: { slides: [], autoplay: true, interval: 5000, source: "manual" as const, bannerPosition: "home-hero" },
  }),
  "blog-preview": () => ({
    id: `bp-${Date.now()}`,
    type: "blog-preview",
    order: 0,
    visible: true,
    props: { heading: "Tin tức", limit: 3, layout: "grid", tagFilter: "" },
  }),
  testimonials: () => ({
    id: `t-${Date.now()}`,
    type: "testimonials",
    order: 0,
    visible: true,
    props: { quotes: [], autoplay: true },
  }),
  "contact-cta": () => ({
    id: `cta-${Date.now()}`,
    type: "contact-cta",
    order: 0,
    visible: true,
    props: { heading: "Sẵn sàng hợp tác?", body: "", ctaText: "Liên hệ", ctaLink: "/contact", bgColor: "" },
  }),
  "stats-counter": () => ({
    id: `sc-${Date.now()}`,
    type: "stats-counter",
    order: 0,
    visible: true,
    props: { heading: "Con số nổi bật", stats: [{ label: "Khách hàng", value: 1000 }] },
  }),
  partners: () => ({
    id: `p-${Date.now()}`,
    type: "partners",
    order: 0,
    visible: true,
    props: { heading: "Đối tác của chúng tôi", logos: [], grayscale: true, speed: 30 },
  }),
  industries: () => ({
    id: `ind-${Date.now()}`,
    type: "industries",
    order: 0,
    visible: true,
    props: { heading: "Lĩnh vực kinh doanh", subheading: "", items: DEFAULT_INDUSTRY_ITEMS },
  }),
  process: () => ({
    id: `pro-${Date.now()}`,
    type: "process",
    order: 0,
    visible: true,
    props: { heading: "Quy trình hợp tác", subheading: "", steps: DEFAULT_PROCESS_STEPS },
  }),
  "feature-showcase": () => ({
    id: `fs-${Date.now()}`,
    type: "feature-showcase",
    order: 0,
    visible: true,
    props: {
      eyebrow: "Về chúng tôi",
      heading: "VHD Corp — kết nối sản phẩm Việt với khách hàng",
      subheading:
        "Kho tổng vật tư điện lạnh, cơ điện và nhà sản xuất khuôn mẫu, đúc nhựa — hàng đúng mô tả, giá sỉ hợp lý, hỗ trợ tận tâm.",
      bullets: ["Sản phẩm đa dạng, rõ nguồn gốc", "Phục vụ cả khách lẻ và doanh nghiệp", "Giao hàng toàn quốc"],
      ctaText: "Xem chi tiết",
      ctaLink: "/about",
      imageSide: "right",
      videoUrl: "",
      image: "",
      thumbnailUrl: "",
    },
  }),
  "use-cases": () => ({
    id: `uc-${Date.now()}`,
    type: "use-cases",
    order: 0,
    visible: true,
    props: {
      eyebrow: "Use Cases",
      heading: "Chúng tôi giải quyết bài toán B2B",
      subheading: "",
      columns: 4,
      cases: DEFAULT_USE_CASES,
    },
  }),
  "faq-accordion": () => ({
    id: `faq-${Date.now()}`,
    type: "faq-accordion",
    order: 0,
    visible: true,
    props: {
      eyebrow: "Câu hỏi thường gặp",
      heading: "Mọi điều bạn cần biết về VHD Corp",
      subheading: "",
      items: DEFAULT_FAQ_ITEMS,
    },
  }),
  "comparison-table": () => ({
    id: `ct-${Date.now()}`,
    type: "comparison-table",
    order: 0,
    visible: true,
    props: {
      eyebrow: "So sánh gói",
      heading: "Chọn gói VHD phù hợp",
      subheading: "",
      columnHeaders: DEFAULT_COMPARISON_COLUMNS,
      rows: DEFAULT_COMPARISON_ROWS,
    },
  }),
  "sticky-story": () => ({
    id: `ss-${Date.now()}`,
    type: "sticky-story",
    order: 0,
    visible: true,
    props: {
      eyebrow: "Cách VHD hoạt động",
      heading: "Bốn bước đến đối tác bền vững",
      subheading: "Quy trình minh bạch — từ tư vấn đến giao hàng.",
      steps: DEFAULT_STORY_STEPS,
    },
  }),
  "scroll-journey": () => ({
    id: `sj-${Date.now()}`,
    type: "scroll-journey",
    order: 0,
    visible: true,
    // scenes bỏ trống → dùng 4 cảnh mặc định của VHD (ảnh sản phẩm thật)
    props: { heading: "Hành trình VHD" },
  }),
  "custom-html": () => ({
    id: `html-${Date.now()}`,
    type: "custom-html",
    order: 0,
    visible: true,
    props: { html: "<div>Custom</div>" },
  }),
  "google-map": () => ({
    id: `map-${Date.now()}`,
    type: "google-map",
    order: 0,
    visible: true,
    props: { heading: "Vị trí của chúng tôi", embed: "Số 1 Đường Mẫu, Hà Nội", height: 420 },
  }),
  "video-embed": () => ({
    id: `vid-${Date.now()}`,
    type: "video-embed",
    order: 0,
    visible: true,
    props: { heading: "Video giới thiệu", url: "" },
  }),
  "social-embed": () => ({
    id: `soc-${Date.now()}`,
    type: "social-embed",
    order: 0,
    visible: true,
    props: { heading: "Fanpage của chúng tôi", url: "https://facebook.com/vhdcorp", height: 420 },
  }),
  "image-banner": () => ({
    id: `ib-${Date.now()}`,
    type: "image-banner",
    order: 0,
    visible: true,
    props: { image: "", link: "", alt: "Banner", maxHeight: 480 },
  }),
};

/** Tất cả các trang admin có thể thiết kế qua Builder — phủ 100% trang nội dung */
const PAGE_OPTIONS = [
  { key: "home", label: "Trang chủ" },
  { key: "about", label: "Giới thiệu" },
  { key: "contact", label: "Liên hệ" },
  { key: "products", label: "Sản phẩm" },
  { key: "posts", label: "Tin tức" },
] as const;
type PageKey = (typeof PAGE_OPTIONS)[number]["key"];

const TYPE_LABELS: Record<Section["type"], string> = {
  hero: "Hero",
  "featured-products": "Sản phẩm nổi bật",
  "category-grid": "Lưới danh mục",
  "banner-slider": "Banner slider",
  "blog-preview": "Bài viết",
  testimonials: "Testimonials",
  "contact-cta": "CTA liên hệ",
  "stats-counter": "Số liệu",
  partners: "Đối tác",
  industries: "Lĩnh vực kinh doanh",
  process: "Quy trình",
  "feature-showcase": "Showcase tính năng",
  "use-cases": "Use Cases B2B",
  "faq-accordion": "FAQ Accordion",
  "comparison-table": "Bảng so sánh",
  "sticky-story": "Sticky Story (Quy trình)",
  "scroll-journey": "Hành trình cuộn (scroll world)",
  "custom-html": "HTML tùy chỉnh",
  "google-map": "Bản đồ Google",
  "video-embed": "Video (YouTube/TikTok)",
  "social-embed": "Fanpage Facebook",
  "image-banner": "Banner ảnh",
};

/** Draggable section row dùng @dnd-kit/sortable */
function SortableSection({
  s,
  selected,
  onSelect,
  onToggleVisible,
  onMove,
  onRemove,
  onDuplicate,
}: {
  s: Section;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const innerRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transform = CSS.Transform.toString(transform) ?? "";
    el.style.transition = transition ?? "";
    el.style.opacity = isDragging ? "0.5" : "1";
    el.style.zIndex = isDragging ? "50" : "";
  }, [transform, transition, isDragging]);
  return (
    <div ref={mergedRef} data-row-id={s.id} {...attributes}>
      <button
        onClick={onSelect}
        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${selected ? "border-brand-primary bg-brand-primary/5" : "hover:bg-accent"}`}
      >
        <div className="flex items-center justify-between gap-1">
          {/* Drag handle */}
          <span
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <span className="font-medium truncate flex-1">{TYPE_LABELS[s.type]}</span>
          <div className="flex gap-0.5 shrink-0">
            <span
              role="button"
              tabIndex={0}
              aria-label="Lên"
              onClick={(e) => {
                e.stopPropagation();
                onMove(-1);
              }}
              className="rounded p-1 hover:bg-muted"
            >
              <ArrowUp className="h-3 w-3" />
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Xuống"
              onClick={(e) => {
                e.stopPropagation();
                onMove(1);
              }}
              className="rounded p-1 hover:bg-muted"
            >
              <ArrowDown className="h-3 w-3" />
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Hiện/ẩn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisible();
              }}
              className="rounded p-1 hover:bg-muted"
            >
              {s.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Nhân bản"
              title="Nhân bản section"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="rounded p-1 hover:bg-muted"
            >
              <CopyPlus className="h-3 w-3" />
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Xóa"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded p-1 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function AdminBuilderPage() {
  const { data, isLoading } = useDraftSiteConfig();
  const saveDraft = useSaveDraftSiteConfig();
  const publish = usePublishSiteConfig();
  const confirm = useConfirm();

  const [draft, setDraft] = useState<SiteConfigValue | null>(null);
  const [page, setPage] = useState<PageKey>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Responsive preview — tuân thủ PRD §4: toggle Mobile/Tablet/Desktop + SIZE TÙY CHỈNH (px)
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop" | "custom">("desktop");
  const [customWidth, setCustomWidth] = useState(1024);
  const deviceMaxWidth =
    device === "mobile" ? 390 : device === "tablet" ? 820 : device === "custom" ? customWidth : undefined;
  // Ref để áp dụng maxWidth qua DOM thay vì inline style (tránh lint)
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;
    if (deviceMaxWidth !== undefined) {
      // Khung "thiết bị" — bo góc + viền + đổ bóng để admin cảm nhận đúng màn hình thật
      el.style.maxWidth = `${Math.max(280, deviceMaxWidth)}px`;
      el.style.borderRadius = "14px";
      el.style.overflow = "hidden";
      el.style.boxShadow = "0 0 0 1px var(--border, #e5e7eb), 0 18px 48px -20px rgba(15,35,86,0.35)";
    } else {
      el.style.maxWidth = "";
      el.style.borderRadius = "";
      el.style.overflow = "";
      el.style.boxShadow = "";
    }
  }, [deviceMaxWidth]);

  // DnD Kit sensors — kéo thả thứ tự sections
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** Cuộn preview tới section (delay nhỏ để React kịp render section mới thêm) */
  const scrollPreviewTo = useCallback((id: string) => {
    setTimeout(() => {
      previewFrameRef.current
        ?.querySelector(`[data-section-id="${id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  /** Chọn section: từ LIST → preview nhảy theo; từ PREVIEW → list row nhảy theo */
  const selectSection = useCallback(
    (id: string, source: "list" | "preview" = "list") => {
      setSelectedId(id);
      if (source === "list") scrollPreviewTo(id);
      else {
        document.querySelector(`[data-row-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [scrollPreviewTo]
  );

  // Đồng bộ draft → store config để các component client trong preview (form liên hệ,
  // header info…) đọc ĐÚNG config đang chỉnh — preview và client là một.
  // setState trực tiếp (không qua setConfig) để KHÔNG áp theme CSS vars lên giao diện admin.
  useEffect(() => {
    if (draft) useSiteConfigStore.setState({ config: draft });
  }, [draft]);

  /** Viền sáng section đang chọn trong preview (đồng bộ khi đổi chọn/sections) */
  useEffect(() => {
    const root = previewFrameRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-section-id]").forEach((el) => {
      const on = el.dataset.sectionId === selectedId;
      el.style.outline = on ? "2px solid #4FB8E7" : "";
      el.style.outlineOffset = on ? "-2px" : "";
      el.style.borderRadius = on ? "4px" : "";
    });
    // Header/Footer toàn site cũng highlight được khi chọn
    const headerEl = root.querySelector<HTMLElement>("header");
    const footerEl = root.querySelector<HTMLElement>("footer");
    if (headerEl) headerEl.style.outline = selectedId === "__header" ? "2px solid #4FB8E7" : "";
    if (footerEl) footerEl.style.outline = selectedId === "__footer" ? "2px solid #4FB8E7" : "";
    const fixedEl = root.querySelector<HTMLElement>("[data-fixed-block]");
    if (fixedEl) fixedEl.style.outline = selectedId === "__fixed" ? "2px solid #4FB8E7" : "";
  });

  // Undo/redo: lưu snapshot của draft để quay lại (giới hạn 50)
  const historyRef = useRef<{ past: SiteConfigValue[]; future: SiteConfigValue[] }>({ past: [], future: [] });
  const skipHistoryRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  useEffect(() => {
    if (data?.value) {
      const v = data.value;
      // Trang chưa có section trong config → nạp layout mặc định tương ứng với
      // giao diện đang hiển thị ngoài site, để admin thấy nội dung hiện tại và
      // chỉnh sửa/kéo thả ngay thay vì canvas trống.
      const homeSeeded = !v.pages?.home?.sections?.length;
      const aboutSeeded = !v.pages?.about?.sections?.length;
      const contactSeeded = !v.pages?.contact?.sections?.length;
      // Merge với DEFAULT để đảm bảo các nhánh chưa có (pages/nav/footer/...) không undefined
      const merged: SiteConfigValue = {
        ...DEFAULT_SITE_CONFIG,
        ...v,
        brand: { ...DEFAULT_SITE_CONFIG.brand, ...(v.brand ?? {}) },
        theme: { ...DEFAULT_SITE_CONFIG.theme, ...(v.theme ?? {}) },
        seo: { ...DEFAULT_SITE_CONFIG.seo, ...(v.seo ?? {}) },
        pages: {
          home: homeSeeded ? { sections: defaultHomeSections() } : v.pages.home,
          about: aboutSeeded ? { sections: defaultAboutSections() } : v.pages.about,
          contact: contactSeeded ? { sections: defaultContactSections() } : v.pages.contact,
          // Trang danh sách: section hiển thị PHÍA TRÊN danh sách sản phẩm/bài viết
          products: v.pages?.products ?? { sections: [] },
          posts: v.pages?.posts ?? { sections: [] },
        },
        navigation: v.navigation ?? DEFAULT_SITE_CONFIG.navigation,
        footer: v.footer ?? DEFAULT_SITE_CONFIG.footer,
      };
      skipHistoryRef.current = true;
      setDraft(merged);
      historyRef.current = { past: [], future: [] };
      syncHistoryFlags();
      // Seed layout → đánh dấu dirty để auto-save persist vào draft (builder từ đó
      // là nguồn chân lý của giao diện các trang).
      const seeded = homeSeeded || aboutSeeded || contactSeeded;
      setDirty(seeded);
      if (seeded) {
        toast.info("Đã nạp layout đang hiển thị của các trang — chỉnh sửa và bấm Lưu/Xuất bản.");
      }
    }
  }, [data, syncHistoryFlags]);

  // Cập nhật draft + ghi history (trừ lần hydrate/undo/redo)
  const updateDraft = useCallback((updater: (prev: SiteConfigValue) => SiteConfigValue) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
    setDirty(true);
  }, []);

  // Khi draft thay đổi, push snapshot trước đó vào past (trừ skip)
  const draftSnapshotRef = useRef<SiteConfigValue | null>(null);
  const historyJustChangedRef = useRef(false);
  useEffect(() => {
    if (!draft) return;
    const prevSnapshot = draftSnapshotRef.current;
    draftSnapshotRef.current = draft;
    // Reset cờ skip/justChanged dù có push hay không (tránh kẹt cờ qua nhiều render)
    const skip = skipHistoryRef.current || historyJustChangedRef.current;
    skipHistoryRef.current = false;
    historyJustChangedRef.current = false;
    if (!prevSnapshot) return;
    if (skip) return;
    historyRef.current = {
      past: [...historyRef.current.past, prevSnapshot].slice(-50),
      future: [],
    };
    setCanUndo(true);
    setCanRedo(false);
  }, [draft]);

  // Beforeunload cảnh báo khi còn thay đổi chưa lưu
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Refs giữ callbacks (để effect hởp trên early-return vẫn truy cập được logic mới nhất)
  const handleSaveRef = useRef<() => void>(() => {});
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  // KHÔNG auto-save: admin chủ động bấm Lưu (hoặc Ctrl+S) — chưa lưu thì thoát là bỏ
  // (beforeunload phía trên đã cảnh báo khi còn thay đổi).

  // Keyboard shortcuts: Ctrl+S lưu, Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSaveRef.current();
      } else if ((e.key === "z" || e.key === "Z") && !e.shiftKey) {
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        undoRef.current();
      } else if (e.key === "y" || e.key === "Y" || ((e.key === "z" || e.key === "Z") && e.shiftKey)) {
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        redoRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cập nhật refs trong useLayoutEffect để không vi phạm react-hooks/refs
  useLayoutEffect(() => {
    handleSaveRef.current = () => {
      void handleSave();
    };
    undoRef.current = undo;
    redoRef.current = redo;
  });

  if (isLoading || !draft) return <p>Đang tải Page Builder...</p>;

  const sections = draft.pages[page]?.sections ?? [];
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  function setSections(next: Section[]) {
    if (!draft) return;
    updateDraft((prev) => ({
      ...prev,
      pages: { ...prev.pages, [page]: { sections: next.map((s, i) => ({ ...s, order: i + 1 })) } },
    }));
  }

  function addSection(type: Section["type"]) {
    const tpl = SECTION_TEMPLATES[type]();
    setSections([...sections, tpl]);
    selectSection(tpl.id, "list"); // preview cuộn tới khối mới thêm
  }
  function removeSection(id: string) {
    setSections(sections.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  /** Nhân bản section — copy toàn bộ props, chèn ngay dưới bản gốc */
  function duplicateSection(id: string) {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const copy = structuredClone(sections[idx]);
    copy.id = crypto.randomUUID();
    const next = [...sections];
    next.splice(idx + 1, 0, copy);
    setSections(next);
    selectSection(copy.id, "list");
  }
  function move(id: string, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSections(next);
  }
  function toggleVisible(id: string) {
    setSections(sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }
  function updateSelected(patch: Record<string, unknown>) {
    if (!selected) return;
    const next = sections.map((s) =>
      s.id === selected.id ? ({ ...s, props: { ...s.props, ...patch } } as Section) : s
    );
    setSections(next);
  }

  /** Xử lý kéo thả kết thúc — sắp xếp lại thứ tự sections */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSections(arrayMove(sections, oldIndex, newIndex));
  }

  function loadDefaults() {
    void (async () => {
      const ok = await confirm({
        title: "Thay thế bằng layout mặc định?",
        description:
          "Toàn bộ section hiện tại trên trang này sẽ bị thay thế bởi bố cục mặc định. Hành động không thể hoàn tác (trừ khi bấm Undo).",
        confirmText: "Thay thế",
        variant: "destructive",
      });
      if (!ok) return;
      // Layout mẫu đúng theo trang đang chọn
      const defaults =
        page === "about"
          ? defaultAboutSections()
          : page === "contact"
            ? defaultContactSections()
            : page === "products" || page === "posts"
              ? defaultListingSections(page)
              : defaultHomeSections();
      setSections(defaults);
    })();
  }

  async function handleSave() {
    if (!draft) return;
    try {
      await saveDraft.mutateAsync({ value: draft });
      setDirty(false);
      setLastSavedAt(new Date());
      toast.success("Đã lưu nháp");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    }
  }
  async function handlePublish() {
    const ok = await confirm({
      title: "Xuất bản layout?",
      description: "Layout hiện tại sẽ được đưa lên trang chính ngay lập tức. Khách truy cập sẽ thấy phiên bản mới.",
      confirmText: "Xuất bản",
    });
    if (!ok) return;
    try {
      await publish.mutateAsync("main");
      setDirty(false);
      setLastSavedAt(new Date());
      toast.success("Đã xuất bản");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xuất bản thất bại");
    }
  }

  function undo() {
    const past = historyRef.current.past;
    if (past.length === 0 || !draft) return;
    const prev = past[past.length - 1];
    historyRef.current = {
      past: past.slice(0, -1),
      future: [draft, ...historyRef.current.future].slice(0, 50),
    };
    historyJustChangedRef.current = true;
    setDraft(prev);
    setDirty(true);
    syncHistoryFlags();
  }
  function redo() {
    const future = historyRef.current.future;
    if (future.length === 0 || !draft) return;
    const next = future[0];
    historyRef.current = {
      past: [...historyRef.current.past, draft].slice(-50),
      future: future.slice(1),
    };
    historyJustChangedRef.current = true;
    setDraft(next);
    setDirty(true);
    syncHistoryFlags();
  }

  return (
    <div className="-m-6 lg:-m-8 grid h-[calc(100vh-2rem)] grid-cols-[280px_1fr_320px]">
      {/* LEFT */}
      <aside className="border-r bg-background overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Page Builder</h2>
            <Select
              value={page}
              onValueChange={(v: PageKey) => {
                setPage(v);
                setSelectedId(null);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_OPTIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="sections" className="p-3">
          <TabsList className="w-full">
            <TabsTrigger value="sections" className="flex-1">
              Sections
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              Thêm
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sections" className="space-y-1 mt-3">
            {sections.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Chưa có section.{" "}
                <Button variant="link" size="sm" onClick={loadDefaults}>
                  Tải layout mẫu
                </Button>
              </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((s) => (
                  <SortableSection
                    key={s.id}
                    s={s}
                    selected={selectedId === s.id}
                    onSelect={() => selectSection(s.id, "list")}
                    onToggleVisible={() => toggleVisible(s.id)}
                    onMove={(dir) => move(s.id, dir)}
                    onRemove={() => removeSection(s.id)}
                    onDuplicate={() => duplicateSection(s.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Nạp lại layout mẫu — luôn hiện (kể cả khi trang đã có section) */}
            {sections.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 w-full gap-1.5 text-xs" onClick={loadDefaults}>
                <Sparkles className="h-3.5 w-3.5" /> Nạp lại layout mẫu cho trang này
              </Button>
            )}

            {/* ── Khối CỐ ĐỊNH của trang (không xóa/kéo được — dữ liệu từ module riêng) ── */}
            {(page === "products" || page === "posts" || page === "contact") && (
              <>
                <p className="mt-4 mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Khối cố định của trang
                </p>
                <button
                  onClick={() => {
                    setSelectedId("__fixed");
                    previewFrameRef.current
                      ?.querySelector("[data-fixed-block]")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`w-full rounded-md border border-dashed px-3 py-2 text-left text-sm transition ${selectedId === "__fixed" ? "border-brand-primary bg-brand-primary/5" : "hover:bg-accent"}`}
                >
                  <span className="font-medium">
                    {page === "contact"
                      ? "📋 Form liên hệ (cố định)"
                      : page === "products"
                        ? "📦 Danh sách sản phẩm (cố định)"
                        : "📰 Danh sách bài viết (cố định)"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {page === "contact"
                      ? "Thông tin liên hệ lấy từ Cài đặt site — section thêm mới nằm phía trên form"
                      : `Dữ liệu lấy từ Quản trị → ${page === "products" ? "Sản phẩm" : "Bài viết"} — section thêm mới nằm phía trên danh sách`}
                  </span>
                </button>
              </>
            )}

            {/* ── Thành phần TOÀN SITE (hiện trên mọi trang) — chỉnh trực tiếp tại đây ── */}
            <p className="mt-4 mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Toàn site (mọi trang)
            </p>
            {(
              [
                ["__header", "Header + thanh promo"],
                ["__footer", "Footer (cam kết, bản đồ, fanpage…)"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setSelectedId(id);
                  previewFrameRef.current
                    ?.querySelector(id === "__footer" ? "footer" : "header")
                    ?.scrollIntoView({ behavior: "smooth", block: id === "__footer" ? "end" : "start" });
                }}
                className={`mb-1 w-full rounded-md border px-3 py-2 text-left text-sm transition ${selectedId === id ? "border-brand-primary bg-brand-primary/5" : "hover:bg-accent"}`}
              >
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </TabsContent>
          <TabsContent value="add" className="space-y-1 mt-3">
            {(Object.keys(SECTION_TEMPLATES) as Section["type"][]).map((t) => (
              <Button key={t} variant="outline" className="w-full justify-start" onClick={() => addSection(t)}>
                <Plus className="mr-2 h-4 w-4" /> {TYPE_LABELS[t]}
              </Button>
            ))}
          </TabsContent>
        </Tabs>
      </aside>

      {/* CENTER */}
      <main className="overflow-y-auto bg-muted/40">
        <div className="sticky top-0 z-10 border-b bg-background px-4 py-2 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo} title="Hoàn tác (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo} title="Làm lại (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saveDraft.isPending} title="Lưu (Ctrl+S)">
            {saveDraft.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}{" "}
            Lưu
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publish.isPending}>
            {publish.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}{" "}
            Xuất bản
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          {/* Responsive toggle (PRD §4): Mobile / Tablet / Desktop */}
          <div className="flex items-center rounded-md border bg-background p-0.5">
            <Button
              size="sm"
              variant={device === "mobile" ? "default" : "ghost"}
              className="h-7 px-2"
              onClick={() => setDevice("mobile")}
              title="Mobile (390px)"
              aria-pressed={device === "mobile"}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={device === "tablet" ? "default" : "ghost"}
              className="h-7 px-2"
              onClick={() => setDevice("tablet")}
              title="Tablet (820px)"
              aria-pressed={device === "tablet"}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={device === "desktop" ? "default" : "ghost"}
              className="h-7 px-2"
              onClick={() => setDevice("desktop")}
              title="Desktop (full)"
              aria-pressed={device === "desktop"}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            {/* Size tùy chỉnh: gõ px bất kỳ để xem đúng cỡ màn cần kiểm tra */}
            <input
              type="number"
              min={280}
              max={3840}
              value={device === "custom" ? customWidth : ""}
              placeholder="px…"
              title="Xem ở chiều rộng tùy chỉnh (px)"
              aria-label="Chiều rộng preview tùy chỉnh (px)"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!e.target.value) return setDevice("desktop");
                setCustomWidth(v);
                setDevice("custom");
              }}
              className="ml-0.5 h-7 w-16 rounded border bg-transparent px-1.5 text-center text-xs outline-none focus:border-brand-accent"
            />
          </div>
          {/* Nhãn kích thước đang xem — admin luôn biết preview rộng bao nhiêu */}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {deviceMaxWidth ? `${deviceMaxWidth}px` : "100%"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              // Lưu nháp trước rồi bật Next draftMode qua /api/preview — trang client render bản DRAFT thật.
              if (dirty) {
                try {
                  await handleSave();
                } catch {
                  /* lỗi đã được toast trong handleSave */
                }
              }
              const target = page === "home" ? "/" : `/${page}`;
              window.open(`/api/preview?redirect=${encodeURIComponent(target)}`, "_blank", "noopener");
            }}
            title="Mở tab xem trước với draft"
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Xem trước
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {dirty
              ? "• Chưa lưu"
              : lastSavedAt
                ? `Đã lưu lúc ${lastSavedAt.toLocaleTimeString("vi-VN")}`
                : "Live preview"}
          </span>
        </div>
        <motion.div suppressHydrationWarning initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-0">
          <div
            ref={previewFrameRef}
            // transform tạo containing-block: header sticky/fixed của site bị "nhốt" trong khung preview
            className="mx-auto bg-background transition-[max-width] duration-200 [transform:translateZ(0)]"
            // Preview = chọn-để-chỉnh (kiểu Wix): click khối nào chọn khối đó,
            // chặn điều hướng link bên trong preview.
            onClickCapture={(e) => {
              const target = e.target as HTMLElement;
              const hit = target.closest?.("[data-section-id]") as HTMLElement | null;
              e.preventDefault();
              e.stopPropagation();
              if (hit?.dataset.sectionId) {
                selectSection(hit.dataset.sectionId, "preview");
              } else if (target.closest?.("[data-fixed-block]")) {
                setSelectedId("__fixed"); // khối cố định của trang — chỉnh chữ hero/tiêu đề
              } else if (target.closest?.("footer")) {
                setSelectedId("__footer"); // chỉnh footer toàn site ngay trong builder
              } else if (target.closest?.("header")) {
                setSelectedId("__header");
              }
            }}
          >
            {/* Header thật của site — đọc config draft từ store, giống hệt client.
                (sticky hoạt động trong khung preview nhờ transform trên container) */}
            <ClientHeader />
            {/* Trang có UI cố định (danh sách SP/bài viết, form liên hệ): luôn render UI THẬT
                y hệt client bên dưới sections — preview = client, cùng một config. */}
            {sections.length === 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-b border-dashed border-brand-accent/40 bg-brand-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
                <span>
                  {page === "products" || page === "posts" || page === "contact"
                    ? "Chưa có section thêm — bên dưới là giao diện thật của trang. Section thêm mới sẽ hiển thị phía trên."
                    : "Trang đang dùng layout mẫu mặc định (giống hệt ngoài site). Nạp vào danh sách để chỉnh từng khối:"}
                </span>
                {page !== "products" && page !== "posts" && page !== "contact" && (
                  <Button onClick={loadDefaults} size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px]">
                    <Sparkles className="h-3 w-3" /> Tải layout mẫu
                  </Button>
                )}
              </div>
            )}
            {/* 0 section ở home/about → client render layout mẫu ⇒ preview cũng vậy (đồng bộ 100%) */}
            {sections.length > 0 ? (
              <PageRenderer sections={sections} />
            ) : page === "home" ? (
              <PageRenderer sections={defaultHomeSections()} />
            ) : page === "about" ? (
              <PageRenderer sections={defaultAboutSections()} />
            ) : null}
            {(page === "products" || page === "posts" || page === "contact") && (
              <div data-fixed-block>
                {page === "products" && <ProductsPageClient />}
                {page === "posts" && <PostsPageClient />}
                {page === "contact" && <ContactForm />}
              </div>
            )}
            {/* Footer thật của site (kèm bản đồ + fanpage nếu admin cấu hình) — giống hệt client */}
            <ClientFooter />
          </div>
        </motion.div>
      </main>

      {/* RIGHT */}
      <aside className="border-l bg-background overflow-y-auto p-4">
        <h2 className="font-bold mb-4">Thuộc tính</h2>
        {selectedId === "__fixed" && (page === "products" || page === "posts" || page === "contact") ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Loại</p>
              <p className="-mt-2 font-medium">
                {page === "contact"
                  ? "Form liên hệ (khối cố định)"
                  : page === "products"
                    ? "Danh sách sản phẩm (khối cố định)"
                    : "Danh sách bài viết (khối cố định)"}
              </p>
              {(
                [
                  [
                    "eyebrow",
                    "Dòng nhỏ phía trên (eyebrow)",
                    page === "contact"
                      ? "Liên hệ với VHD Corp"
                      : page === "products"
                        ? "Bộ sưu tập sản phẩm"
                        : "Câu chuyện VHD",
                  ],
                  [
                    "title",
                    "Tiêu đề lớn",
                    page === "contact"
                      ? "Cùng nhau xây dựng giá trị bền vững"
                      : page === "products"
                        ? "Sản phẩm VHD Corp"
                        : "Tin tức & Bài viết",
                  ],
                  [
                    "description",
                    "Mô tả",
                    page === "contact"
                      ? "Đội ngũ VHD Corp luôn sẵn sàng tư vấn về sản phẩm, báo giá B2B/B2C và lịch giao hàng. Phản hồi trong vòng 24 giờ."
                      : page === "products"
                        ? "Kho tổng vật tư điện lạnh, cơ điện (M&E) và khuôn mẫu, đúc nhựa — chất lượng ổn định, giao hàng toàn quốc cho khách hàng B2B/B2C."
                        : "Cập nhật về sản phẩm mới, hoạt động hợp tác, kiến thức ngành điện lạnh, cơ điện và khuôn mẫu, đúc nhựa.",
                  ],
                ] as const
              ).map(([key, label, ph]) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium">{label}</p>
                  <textarea
                    rows={key === "description" ? 3 : 1}
                    placeholder={ph}
                    className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm placeholder:text-muted-foreground/50"
                    value={draft.fixedBlocks?.[page]?.[key] ?? ""}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        fixedBlocks: {
                          ...prev.fixedBlocks,
                          [page]: { ...prev.fixedBlocks?.[page], [key]: e.target.value },
                        },
                      }))
                    }
                  />
                </div>
              ))}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Chữ mờ trong ô = nội dung <b>mặc định đang hiển thị</b> trên site. Gõ vào là thay thế; xóa trống là quay
                về mặc định.
              </p>
              <div className="space-y-1">
                <p className="text-xs font-medium">Ảnh nền hero (tùy chọn — có overlay tối để chữ dễ đọc)</p>
                <ImageUploader
                  value={draft.fixedBlocks?.[page]?.heroImage ?? ""}
                  onChange={(url) =>
                    updateDraft((prev) => ({
                      ...prev,
                      fixedBlocks: {
                        ...prev.fixedBlocks,
                        [page]: { ...prev.fixedBlocks?.[page], heroImage: url },
                      },
                    }))
                  }
                  folder="heroes"
                  label="ảnh nền"
                />
              </div>
              {page === "contact" &&
                (
                  [
                    ["infoHeading", "Tiêu đề cột thông tin", "Thông tin liên hệ"],
                    ["infoDescription", "Mô tả cột thông tin", "Chọn kênh phù hợp nhất với bạn…"],
                    ["formHeading", "Tiêu đề form", "Gửi yêu cầu"],
                    ["formDescription", "Mô tả form", "Điền đầy đủ thông tin…"],
                  ] as const
                ).map(([key, label, ph]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-xs font-medium">{label}</p>
                    <input
                      placeholder={ph}
                      className="h-9 w-full rounded-md border bg-transparent px-2.5 text-sm"
                      value={draft.fixedBlocks?.contact?.[key] ?? ""}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          fixedBlocks: {
                            ...prev.fixedBlocks,
                            contact: { ...prev.fixedBlocks?.contact, [key]: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              <p className="text-[11px] text-muted-foreground">
                {page === "contact"
                  ? "Email / hotline / địa chỉ của cột thông tin lấy từ Cài đặt site → Footer → Thông tin liên hệ."
                  : "Dữ liệu danh sách lấy từ trang Quản trị tương ứng. Để trống ô nào thì dùng nội dung mặc định."}{" "}
                Sửa ở đây preview đổi ngay — bấm Lưu/Xuất bản như thường.
              </p>
            </CardContent>
          </Card>
        ) : selectedId === "__footer" ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Loại</p>
              <p className="-mt-2 font-medium">Footer (toàn site)</p>
              <div className="space-y-1">
                <p className="text-xs font-medium">Mô tả công ty</p>
                <textarea
                  rows={3}
                  className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm"
                  value={draft.footer.description ?? ""}
                  onChange={(e) =>
                    updateDraft((prev) => ({ ...prev, footer: { ...prev.footer, description: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Copyright</p>
                <input
                  className="h-9 w-full rounded-md border bg-transparent px-2.5 text-sm"
                  value={draft.footer.copyright}
                  onChange={(e) =>
                    updateDraft((prev) => ({ ...prev, footer: { ...prev.footer, copyright: e.target.value } }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Hiện bản đồ</p>
                <input
                  type="checkbox"
                  aria-label="Hiện bản đồ"
                  checked={!!draft.footer.showMap}
                  onChange={(e) =>
                    updateDraft((prev) => ({ ...prev, footer: { ...prev.footer, showMap: e.target.checked } }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Google Maps (iframe/link/địa chỉ)</p>
                <textarea
                  rows={2}
                  className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm"
                  value={draft.footer.mapEmbed ?? ""}
                  onChange={(e) =>
                    updateDraft((prev) => ({ ...prev, footer: { ...prev.footer, mapEmbed: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Fanpage Facebook (URL)</p>
                <input
                  className="h-9 w-full rounded-md border bg-transparent px-2.5 text-sm"
                  value={draft.footer.facebookPage ?? ""}
                  onChange={(e) =>
                    updateDraft((prev) => ({ ...prev, footer: { ...prev.footer, facebookPage: e.target.value } }))
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dải cam kết, cột link, kênh liên hệ nổi… chỉnh đầy đủ tại{" "}
                <a href="/admin/settings" className="font-semibold text-brand-primary hover:underline">
                  Cài đặt site → Footer
                </a>
                . Sửa ở đây preview cập nhật ngay — bấm Lưu/Xuất bản như thường.
              </p>
            </CardContent>
          </Card>
        ) : selectedId === "__header" ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Loại</p>
              <p className="-mt-2 font-medium">Header (toàn site)</p>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Hiện thanh promo</p>
                <input
                  type="checkbox"
                  aria-label="Hiện thanh promo"
                  checked={!!draft.header?.showPromo}
                  onChange={(e) =>
                    updateDraft((prev) => ({ ...prev, header: { ...prev.header, showPromo: e.target.checked } }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Nội dung promo</p>
                <input
                  className="h-9 w-full rounded-md border bg-transparent px-2.5 text-sm"
                  value={draft.header?.promoText ?? ""}
                  onChange={(e) =>
                    updateDraft((prev) => ({ ...prev, header: { ...prev.header, promoText: e.target.value } }))
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Logo, menu điều hướng… chỉnh tại{" "}
                <a href="/admin/settings" className="font-semibold text-brand-primary hover:underline">
                  Cài đặt site
                </a>{" "}
                (tab Brand / Navigation).
              </p>
            </CardContent>
          </Card>
        ) : !selected ? (
          <p className="text-sm text-muted-foreground">Chọn một section để chỉnh sửa.</p>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Loại</p>
                <p className="font-medium">{TYPE_LABELS[selected.type]}</p>
              </div>
              <SectionPropsEditor
                // Merge props với template đầy đủ của loại section → panel LUÔN hiện đủ
                // mọi thuộc tính chỉnh được (kể cả key tùy chọn chưa từng đặt, vd bgImage)
                section={
                  {
                    ...selected,
                    props: { ...SECTION_TEMPLATES[selected.type]().props, ...selected.props },
                  } as Section
                }
                onChange={updateSelected}
              />
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
