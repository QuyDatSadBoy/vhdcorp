"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Mật khẩu mới tối thiểu 6 ký tự");
    if (newPassword !== confirm) return toast.error("Xác nhận mật khẩu không khớp");
    try {
      setPending(true);
      await axios.put("/users/me/password", { currentPassword, newPassword });
      toast.success("Đổi mật khẩu thành công");
      setCurrent(""); setNewPwd(""); setConfirm("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Đổi mật khẩu thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <motion.form
      suppressHydrationWarning
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className="max-w-xl space-y-5 rounded-2xl border border-foreground/8 bg-card p-7"
    >
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Đổi mật khẩu</h1>
        <p className="mt-1 text-sm text-foreground/55">
          Sử dụng mật khẩu mạnh tối thiểu 6 ký tự, kết hợp chữ + số + ký tự đặc biệt.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cur">Mật khẩu hiện tại</Label>
        <Input id="cur" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new">Mật khẩu mới</Label>
        <Input id="new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPwd(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cnf">Xác nhận mật khẩu</Label>
        <Input id="cnf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-[color:var(--vhd-color-primary)] px-6 text-sm font-semibold text-white hover:bg-[color:var(--vhd-color-primary)]/90"
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Cập nhật mật khẩu
      </Button>
    </motion.form>
  );
}
