"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import type { Post } from "@/types/domain";
import { aiApi } from "@/services/ai.service";
import { useCreatePost, useUpdatePost } from "@/services/post.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { RichEditor } from "@/components/admin/rich-editor";
import { slugify } from "@/lib/utils";
import ImageUploader from "@/components/admin/image-uploader";

interface Props {
  initial?: Post;
}

export function PostForm({ initial }: Props) {
  const router = useRouter();
  const create = useCreatePost();
  const update = useUpdatePost();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const slugLocked = useRef(!!initial?.slug);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [tags, setTags] = useState<string>(initial?.tags?.join(", ") ?? "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "SCHEDULED">(initial?.status ?? "DRAFT");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDesc, setMetaDesc] = useState(initial?.metaDesc ?? "");
  const [aiIdea, setAiIdea] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function handleAiDraft() {
    if (!aiIdea.trim() && !coverImage) {
      toast.error("Nhập ý tưởng hoặc tải ảnh bìa để AI gợi ý bài viết.");
      return;
    }
    setAiLoading(true);
    try {
      const r = await aiApi.postDraft({ idea: aiIdea.trim() || undefined, images: coverImage ? [coverImage] : [] });
      if (r.title && !title.trim()) setTitle(r.title);
      if (r.excerpt) setExcerpt(r.excerpt);
      if (r.content) setContent(r.content);
      if (r.metaTitle) setMetaTitle(r.metaTitle);
      if (r.metaDesc) setMetaDesc(r.metaDesc);
      toast.success("AI đã soạn nháp — bạn xem lại và chỉnh sửa nhé.");
    } catch {
      toast.error("AI không phản hồi, thử lại sau giây lát.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (!slugLocked.current && title) {
      setSlug(slugify(title));
    }
  }, [title]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<Post> = {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      coverImage: coverImage || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status,
      isFeatured,
      metaTitle: metaTitle || null,
      metaDesc: metaDesc || null,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, payload });
      else await create.mutateAsync(payload);
      toast.success("Đã lưu");
      router.push("/admin/posts");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <motion.form
      suppressHydrationWarning
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className="grid gap-6 lg:grid-cols-[1fr_320px]"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* AI trợ giúp: nhập ý tưởng hoặc dùng ảnh bìa → AI đọc ảnh + web search → soạn nháp */}
            <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-primary">
                <Sparkles className="h-4 w-4" /> AI gợi ý bài viết (ý tưởng/ảnh + tìm web)
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={aiIdea}
                  onChange={(e) => setAiIdea(e.target.value)}
                  placeholder="Nhập ý tưởng/chủ đề (vd: cách chọn gas lạnh) — hoặc tải ảnh bìa rồi bấm AI"
                  className="flex-1"
                />
                <Button type="button" onClick={handleAiDraft} disabled={aiLoading} className="gap-1.5 shrink-0">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiLoading ? "Đang soạn…" : "AI soạn bài"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  slugLocked.current = true;
                  setSlug(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tóm tắt</Label>
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Nội dung bài viết</Label>
              <RichEditor
                value={content}
                onChange={setContent}
                uploadFolder="posts"
                placeholder="Viết bài viết của bạn ở đây..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">SEO</h3>
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={status} onValueChange={(v: "DRAFT" | "PUBLISHED" | "SCHEDULED") => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Bản nháp</SelectItem>
                  <SelectItem value="PUBLISHED">Xuất bản</SelectItem>
                  <SelectItem value="SCHEDULED">Lên lịch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Bài nổi bật — admin bật để đưa lên đầu / vào slider trang chủ */}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3 text-sm">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 accent-brand-primary"
              />
              <span className="font-medium text-brand-primary">Bài viết nổi bật</span>
              <span className="text-[11px] text-muted-foreground">(lên đầu / vào slider)</span>
            </label>
            <div className="space-y-2">
              <Label>Tags (cách nhau bằng phẩy)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ảnh bìa</Label>
              <ImageUploader
                value={coverImage}
                onChange={setCoverImage}
                folder="posts"
                aspect="video"
                allowUrlInput
                label="ảnh bìa"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initial ? "Cập nhật" : "Tạo mới"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.form>
  );
}
