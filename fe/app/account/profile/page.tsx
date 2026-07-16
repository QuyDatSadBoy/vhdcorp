"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { uploadToCloudinary } from "@/services/media.service";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Đồng bộ form khi auth store hydrate xong (Zustand persist load sau mount)
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setAvatar(user.avatar ?? "");
      setPhone(user.phone ?? "");
      setAddress(user.address ?? "");
    }
  }, [user]);

  async function handleAvatarUpload(file: File) {
    try {
      setUploading(true);
      const media = await uploadToCloudinary(file, "avatars");
      setAvatar(media.url);
      // LƯU NGAY vào hồ sơ — không bắt user phải bấm "Lưu thay đổi" nữa (reload không mất)
      const { data } = await axios.put("/users/me", { avatar: media.url });
      setUser(data?.data ?? { ...user!, avatar: media.url });
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      setSaving(true);
      const { data } = await axios.put("/users/me", { name, avatar, phone, address });
      setUser(data?.data ?? { ...user!, name, avatar, phone, address });
      toast.success("Đã lưu hồ sơ");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <motion.form
      suppressHydrationWarning
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={save}
      className="rounded-xl border bg-card p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Hồ sơ của tôi</h1>
        {user.googleId ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.74 3.86 14.62 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.64-3.66 8.64-8.81 0-.59-.06-1.04-.13-1.49z"
              />
            </svg>
            Tài khoản Google
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Quản lý thông tin cá nhân và ảnh đại diện.</p>

      <div className="mt-6 flex flex-col items-start gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border bg-muted">
            {avatar ? (
              <Image src={avatar} alt={name} fill sizes="128px" className="object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-3xl font-bold text-muted-foreground">
                {name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            />
            <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs hover:bg-accent">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Đổi ảnh
            </span>
          </label>
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Họ tên</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0901 234 567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ giao hàng</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 12 Nguyễn Huệ, Quận 1, TP.HCM"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            SĐT + địa chỉ sẽ được tự điền sẵn khi bạn đặt hàng — đặt đơn chỉ mất vài giây.
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
