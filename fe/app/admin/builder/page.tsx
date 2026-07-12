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
  LayoutTemplate,
  MousePointerClick,
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
import SectionPropsEditor from "@/components/admin/section-props-editor";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { PageRenderer } from "@/components/sections";
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
    },
  }),
  "featured-products": () => ({
    id: `fp-${Date.now()}`,
    type: "featured-products",
    order: 0,
    visible: true,
    props: { heading: "Sản phẩm nổi bật", limit: 8 },
  }),
  "category-grid": () => ({
    id: `cg-${Date.now()}`,
    type: "category-grid",
    order: 0,
    visible: true,
    props: { heading: "Danh mục", categoryIds: [] },
  }),
  "banner-slider": () => ({
    id: `bs-${Date.now()}`,
    type: "banner-slider",
    order: 0,
    visible: true,
    props: { slides: [], autoplay: true, interval: 5000 },
  }),
  "blog-preview": () => ({
    id: `bp-${Date.now()}`,
    type: "blog-preview",
    order: 0,
    visible: true,
    props: { heading: "Tin tức", limit: 3 },
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
    props: { heading: "Sẵn sàng hợp tác?", ctaText: "Liên hệ", ctaLink: "/contact" },
  }),
  "stats-counter": () => ({
    id: `sc-${Date.now()}`,
    type: "stats-counter",
    order: 0,
    visible: true,
    props: { stats: [{ label: "Khách hàng", value: 1000 }] },
  }),
  partners: () => ({ id: `p-${Date.now()}`, type: "partners", order: 0, visible: true, props: { logos: [] } }),
  industries: () => ({
    id: `ind-${Date.now()}`,
    type: "industries",
    order: 0,
    visible: true,
    props: { heading: "Lĩnh vực kinh doanh" },
  }),
  process: () => ({
    id: `pro-${Date.now()}`,
    type: "process",
    order: 0,
    visible: true,
    props: { heading: "Quy trình hợp tác" },
  }),
  "feature-showcase": () => ({
    id: `fs-${Date.now()}`,
    type: "feature-showcase",
    order: 0,
    visible: true,
    props: {
      eyebrow: "Showcase",
      heading: "Tham quan nhà máy VHD",
      subheading: "Hệ thống nhà máy hiện đại đạt chuẩn ISO 9001, công suất 50.000 sản phẩm/tháng.",
      bullets: ["50.000 sản phẩm/tháng", "Đạt chuẩn ISO 9001", "Đội ngũ 200+ kỹ sư"],
      ctaText: "Tìm hiểu thêm",
      ctaLink: "/about",
      imageSide: "right",
      badge: "EXCLUSIVE B2B",
    },
  }),
  "use-cases": () => ({
    id: `uc-${Date.now()}`,
    type: "use-cases",
    order: 0,
    visible: true,
    props: { eyebrow: "Use Cases", heading: "Chúng tôi giải quyết bài toán B2B", columns: 4 },
  }),
  "faq-accordion": () => ({
    id: `faq-${Date.now()}`,
    type: "faq-accordion",
    order: 0,
    visible: true,
    props: { eyebrow: "Câu hỏi thường gặp", heading: "Mọi điều bạn cần biết về VHD Corp" },
  }),
  "comparison-table": () => ({
    id: `ct-${Date.now()}`,
    type: "comparison-table",
    order: 0,
    visible: true,
    props: { eyebrow: "So sánh gói", heading: "Chọn gói VHD phù hợp" },
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
    },
  }),
  "custom-html": () => ({
    id: `html-${Date.now()}`,
    type: "custom-html",
    order: 0,
    visible: true,
    props: { html: "<div>Custom</div>" },
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
  "custom-html": "HTML tùy chỉnh",
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
  // Responsive preview — tuân thủ PRD §4: builder phải có toggle Mobile/Tablet/Desktop
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const deviceMaxWidth = device === "mobile" ? 390 : device === "tablet" ? 820 : undefined;
  // Ref để áp dụng maxWidth qua DOM thay vì inline style (tránh lint)
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;
    if (deviceMaxWidth !== undefined) {
      el.style.maxWidth = `${deviceMaxWidth}px`;
      el.style.boxShadow = "0 0 0 1px var(--border, #e5e7eb)";
    } else {
      el.style.maxWidth = "";
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
          </div>
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
            className="mx-auto bg-background transition-[max-width] duration-200"
            // Preview = chọn-để-chỉnh (kiểu Wix): click khối nào chọn khối đó,
            // chặn điều hướng link bên trong preview.
            onClickCapture={(e) => {
              const hit = (e.target as HTMLElement).closest?.("[data-section-id]") as HTMLElement | null;
              e.preventDefault();
              e.stopPropagation();
              if (hit?.dataset.sectionId) selectSection(hit.dataset.sectionId, "preview");
            }}
          >
            {sections.length === 0 ? (
              <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
                <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-dashed border-foreground/15 bg-linear-to-br from-background via-muted/30 to-background p-6 text-center shadow-sm sm:p-8">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-brand-primary/15 blur-3xl"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-brand-accent/15 blur-3xl"
                  />
                  <div className="relative">
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-linear-to-br from-brand-primary to-brand-accent text-white shadow-lg shadow-brand-primary/30">
                      <LayoutTemplate className="h-6 w-6" />
                    </div>
                    <h2 className="mb-2 text-lg font-bold tracking-tight text-foreground">Canvas đang trống</h2>
                    <p className="mx-auto mb-5 max-w-xs text-xs text-muted-foreground sm:text-sm">
                      {page === "products" || page === "posts"
                        ? "Section thêm ở đây sẽ hiển thị PHÍA TRÊN danh sách (banner khuyến mãi, CTA…) — danh sách sản phẩm/bài viết vẫn giữ nguyên bên dưới."
                        : "Trang này đang dùng giao diện dựng sẵn ngoài site. Thêm section ở đây để tự thiết kế và ghi đè — hoặc tải layout mẫu để bắt đầu nhanh."}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button onClick={loadDefaults} size="sm" className="gap-1.5">
                        <Sparkles className="h-4 w-4" /> Tải layout mẫu
                      </Button>
                      <Button onClick={() => addSection("hero")} size="sm" variant="outline" className="gap-1.5">
                        <Plus className="h-4 w-4" /> Thêm Hero
                      </Button>
                    </div>
                    <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
                      <MousePointerClick className="h-3 w-3" />
                      Mẹo: kéo thả các section để sắp xếp lại
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <PageRenderer sections={sections} />
            )}
          </div>
        </motion.div>
      </main>

      {/* RIGHT */}
      <aside className="border-l bg-background overflow-y-auto p-4">
        <h2 className="font-bold mb-4">Thuộc tính</h2>
        {!selected ? (
          <p className="text-sm text-muted-foreground">Chọn một section để chỉnh sửa.</p>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Loại</p>
                <p className="font-medium">{TYPE_LABELS[selected.type]}</p>
              </div>
              <SectionPropsEditor section={selected} onChange={updateSelected} />
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
