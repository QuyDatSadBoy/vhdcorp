"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Mail, Save, ShieldCheck, UserCircle } from "lucide-react";
import axios from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import ImageUploader from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUser } from "@/types/auth";

/**
 * Thông tin cá nhân của tài khoản quản trị đang đăng nhập:
 * - Sửa tên hiển thị + ảnh đại diện.
 * - Đổi email (xác nhận bằng mật khẩu hiện tại).
 * - Đổi mật khẩu (BẮT BUỘC nhập mật khẩu cũ — kể cả tài khoản root).
 */
export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setAvatar(user.avatar ?? "");
    }
  }, [user]);

  const saveInfo = async () => {
    try {
      setSavingInfo(true);
      const { data } = await axios.put<{ data: AuthUser }>("/users/me", { name: name.trim(), avatar });
      setUser(data.data);
      toast.success("Đã cập nhật thông tin cá nhân");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setSavingInfo(false);
    }
  };

  const saveEmail = async () => {
    if (!newEmail.trim() || !emailPassword) {
      toast.error("Nhập email mới và mật khẩu xác nhận");
      return;
    }
    try {
      setSavingEmail(true);
      const { data } = await axios.put<{ data: AuthUser }>("/users/me/email", {
        newEmail: newEmail.trim(),
        password: emailPassword,
      });
      setUser(data.data);
      toast.success("Đã đổi email đăng nhập — dùng email mới từ lần đăng nhập sau");
      setNewEmail("");
      setEmailPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đổi email thất bại");
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới tối thiểu 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu mới không khớp");
      return;
    }
    try {
      setSavingPassword(true);
      await axios.put("/users/me/password", { currentPassword, newPassword });
      toast.success("Đã đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đổi mật khẩu thất bại");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <UserCircle className="h-6 w-6 text-brand-primary" />
          Thông tin cá nhân
        </h1>
        <p className="text-sm text-muted-foreground">
          Tài khoản đang đăng nhập: <b>{user?.email}</b>
          {user?.isRoot && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
              <ShieldCheck className="h-3 w-3" /> TÀI KHOẢN TỐI CAO (ROOT)
            </span>
          )}
        </p>
      </div>

      {/* ── Thông tin hiển thị ── */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-semibold">Tên & ảnh đại diện</h2>
          <div className="space-y-1.5">
            <Label>Tên hiển thị</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VHD Admin" />
          </div>
          <div className="space-y-1.5">
            <Label>Ảnh đại diện</Label>
            <div className="max-w-40">
              <ImageUploader value={avatar} onChange={setAvatar} folder="avatars" aspect="square" label="avatar" />
            </div>
          </div>
          <Button onClick={() => void saveInfo()} disabled={savingInfo}>
            {savingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu thông tin
          </Button>
        </CardContent>
      </Card>

      {/* ── Đổi email ── */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mail className="h-4 w-4 text-brand-primary" /> Đổi email đăng nhập
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email mới</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email.moi@gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu hiện tại (xác nhận)</Label>
              <Input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" onClick={() => void saveEmail()} disabled={savingEmail}>
            {savingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đổi email
          </Button>
        </CardContent>
      </Card>

      {/* ── Đổi mật khẩu — LUÔN cần mật khẩu cũ ── */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound className="h-4 w-4 text-brand-primary" /> Đổi mật khẩu
          </h2>
          <p className="text-xs text-muted-foreground">
            Vì lý do bảo mật, đổi mật khẩu tài khoản của chính bạn luôn yêu cầu mật khẩu cũ — kể cả tài khoản tối cao.
            (Reset mật khẩu cho tài khoản CẤP DƯỚI ở trang Người dùng thì không cần.)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Mật khẩu hiện tại</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu mới</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nhập lại mật khẩu mới</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" onClick={() => void savePassword()} disabled={savingPassword}>
            {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đổi mật khẩu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
