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
  GripVertical,
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
import { defaultHomeSections } from "@/lib/default-sections";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { PageRenderer } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
}: {
  s: Section;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
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
    <div ref={mergedRef} {...attributes}>
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

  const [draft, setDraft] = useState<SiteConfigValue | null>(null);
  const [page, setPage] = useState<"home" | "about" | "contact">("home");
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
      // Merge với DEFAULT để đảm bảo các nhánh chưa có (pages/nav/footer/...) không undefined
      const merged: SiteConfigValue = {
        ...DEFAULT_SITE_CONFIG,
        ...v,
        brand: { ...DEFAULT_SITE_CONFIG.brand, ...(v.brand ?? {}) },
        theme: { ...DEFAULT_SITE_CONFIG.theme, ...(v.theme ?? {}) },
        seo: { ...DEFAULT_SITE_CONFIG.seo, ...(v.seo ?? {}) },
        pages: {
          home: v.pages?.home ?? { sections: [] },
          about: v.pages?.about ?? { sections: [] },
          contact: v.pages?.contact ?? { sections: [] },
        },
        navigation: v.navigation ?? DEFAULT_SITE_CONFIG.navigation,
        footer: v.footer ?? DEFAULT_SITE_CONFIG.footer,
      };
      skipHistoryRef.current = true;
      setDraft(merged);
      historyRef.current = { past: [], future: [] };
      syncHistoryFlags();
      setDirty(false);
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

  // Auto-save mỗi 30s khi có thay đổi
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      handleSaveRef.current();
    }, 30_000);
    return () => clearTimeout(timer);
  }, [dirty, draft]);

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
    setSelectedId(tpl.id);
  }
  function removeSection(id: string) {
    setSections(sections.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
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
    if (!confirm("Thay thế bằng layout mặc định?")) return;
    setSections(defaultHomeSections());
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
    if (!confirm("Xuất bản layout hiện tại?")) return;
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
              onValueChange={(v: "home" | "about" | "contact") => {
                setPage(v);
                setSelectedId(null);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Trang chủ</SelectItem>
                <SelectItem value="about">Giới thiệu</SelectItem>
                <SelectItem value="contact">Liên hệ</SelectItem>
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
                    onSelect={() => setSelectedId(s.id)}
                    onToggleVisible={() => toggleVisible(s.id)}
                    onMove={(dir) => move(s.id, dir)}
                    onRemove={() => removeSection(s.id)}
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
              // Lưu nháp trước rồi mở tab mới với cờ ?preview=draft để FE đọc draft.
              if (dirty) {
                try {
                  await handleSave();
                } catch {
                  /* lỗi đã được toast trong handleSave */
                }
              }
              window.open("/?preview=draft", "_blank", "noopener");
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
          <div ref={previewFrameRef} className="mx-auto bg-background transition-[max-width] duration-200">
            <PageRenderer sections={sections} />
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
              <PropsEditor section={selected} onChange={updateSelected} />
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function PropsEditor({ section, onChange }: { section: Section; onChange: (patch: Record<string, unknown>) => void }) {
  const props = section.props as unknown as Record<string, unknown>;
  const fields = Object.keys(props).filter(
    (k) => !["paddingTop", "paddingBottom", "background", "animation", "animationDelay"].includes(k)
  );

  return (
    <div className="space-y-3">
      {fields.map((k) => {
        const v = props[k];
        if (typeof v === "string") {
          if (k.toLowerCase().includes("html") || k === "subheading" || k === "body" || k === "description") {
            return (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{k}</Label>
                <Textarea rows={3} value={v} onChange={(e) => onChange({ [k]: e.target.value })} />
              </div>
            );
          }
          return (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{k}</Label>
              <Input value={v} onChange={(e) => onChange({ [k]: e.target.value })} />
            </div>
          );
        }
        if (typeof v === "number") {
          return (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{k}</Label>
              <Input type="number" value={v} onChange={(e) => onChange({ [k]: Number(e.target.value) })} />
            </div>
          );
        }
        if (typeof v === "boolean") {
          return (
            <div key={k} className="flex items-center justify-between">
              <Label className="text-xs" htmlFor={`bool-${k}`}>
                {k}
              </Label>
              <input
                id={`bool-${k}`}
                type="checkbox"
                aria-label={k}
                title={k}
                checked={v}
                onChange={(e) => onChange({ [k]: e.target.checked })}
              />
            </div>
          );
        }
        return (
          <div key={k} className="space-y-1">
            <Label className="text-xs">{k} (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-xs"
              value={JSON.stringify(v, null, 2)}
              onChange={(e) => {
                try {
                  onChange({ [k]: JSON.parse(e.target.value) });
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
