"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Post } from "@/types/domain";
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

interface Props { initial?: Post }

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
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDesc, setMetaDesc] = useState(initial?.metaDesc ?? "");

  useEffect(() => {
    if (!slugLocked.current && title) {
      setSlug(slugify(title));
    }
  }, [title]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<Post> = {
      title, slug, excerpt: excerpt || null, content, coverImage: coverImage || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      status, metaTitle: metaTitle || null, metaDesc: metaDesc || null,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, payload });
      else await create.mutateAsync(payload);
      toast.success("Đã lưu");
      router.push("/admin/posts");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lưu thất bại"); }
  }

  const pending = create.isPending || update.isPending;

  return (
    <motion.form suppressHydrationWarning initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card><CardContent className="p-6 space-y-4">
          <div className="space-y-2"><Label>Tiêu đề</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => { slugLocked.current = true; setSlug(e.target.value); }} required /></div>
          <div className="space-y-2"><Label>Tóm tắt</Label><Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} /></div>
          <div className="space-y-2">
            <Label>Nội dung bài viết</Label>
            <RichEditor
              value={content}
              onChange={setContent}
              uploadFolder="posts"
              placeholder="Viết bài viết của bạn ở đây..."
            />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">SEO</h3>
          <div className="space-y-2"><Label>Meta Title</Label><Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Meta Description</Label><Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} /></div>
        </CardContent></Card>
      </div>

      <div className="space-y-6">
        <Card><CardContent className="p-6 space-y-4">
          <div className="space-y-2"><Label>Trạng thái</Label>
            <Select value={status} onValueChange={(v: "DRAFT" | "PUBLISHED" | "SCHEDULED") => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Bản nháp</SelectItem>
                <SelectItem value="PUBLISHED">Xuất bản</SelectItem>
                <SelectItem value="SCHEDULED">Lên lịch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Tags (cách nhau bằng phẩy)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} /></div>
          <div className="space-y-2"><Label>Ảnh bìa</Label>
            <ImageUploader value={coverImage} onChange={setCoverImage} folder="posts" aspect="video" allowUrlInput label="ảnh bìa" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initial ? "Cập nhật" : "Tạo mới"}
          </Button>
        </CardContent></Card>
      </div>
    </motion.form>
  );
}
