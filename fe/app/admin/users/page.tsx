"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, Pencil, RotateCcw, Search, Trash2, UserPlus } from "lucide-react";
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserRole,
  useResetUserPassword,
  useRestoreUser,
  useSoftDeleteUser,
} from "@/services/user.service";
import { AdminTable } from "@/components/admin/admin-table";
import SendMailDialog from "@/components/admin/send-mail-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminUser } from "@/types/domain";

const ROLES: AdminUser["role"][] = ["ADMIN", "STAFF", "CUSTOMER"];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState(""); // giá trị đã submit (Enter/blur) — tránh refetch từng phím
  const [showDeleted, setShowDeleted] = useState(false);
  /** Lọc theo vai trò — mặc định xem tất cả; "Khách hàng" = client thuần */
  const [roleFilter, setRoleFilter] = useState<"" | AdminUser["role"]>("CUSTOMER"); // mặc định: khách hàng

  const { data, isLoading } = useAdminUsers({
    email: email || undefined,
    deletedOnly: showDeleted || undefined,
    role: roleFilter || undefined,
  });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateRole = useUpdateUserRole();
  const resetPassword = useResetUserPassword();
  const restoreUser = useRestoreUser();
  const softDelete = useSoftDeleteUser();
  const confirm = useConfirm();

  /** Chọn nhiều user để gửi email */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mailOpen, setMailOpen] = useState(false);
  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Dialog tạo user */
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "STAFF" as AdminUser["role"] });

  /** Dialog sửa tên / đặt lại mật khẩu */
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const rows = data?.records ?? [];

  const submitCreate = async () => {
    if (!form.email.trim() || form.password.length < 6) {
      toast.error("Cần email hợp lệ và mật khẩu tối thiểu 6 ký tự");
      return;
    }
    try {
      await createUser.mutateAsync({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim() || undefined,
        role: form.role,
      });
      toast.success(`Đã tạo tài khoản ${form.email.trim()}`);
      setCreateOpen(false);
      setForm({ email: "", name: "", password: "", role: "STAFF" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo tài khoản thất bại");
    }
  };

  const submitEditName = async () => {
    if (!editUser) return;
    try {
      await updateUser.mutateAsync({ id: editUser.id, name: editName.trim() });
      toast.success("Đã cập nhật tên");
      setEditUser(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    }
  };

  const submitResetPassword = async () => {
    if (!pwUser) return;
    if (newPassword.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    try {
      await resetPassword.mutateAsync({ id: pwUser.id, newPassword });
      toast.success(`Đã đặt lại mật khẩu cho ${pwUser.email}`);
      setPwUser(null);
      setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đặt lại mật khẩu thất bại");
    }
  };

  return (
    <>
      <AdminTable
        title="Người dùng"
        description="Tạo tài khoản, đổi vai trò, sửa tên, đặt lại mật khẩu, xóa/khôi phục. Không thể tự thao tác trên chính mình."
        isLoading={isLoading}
        rows={rows}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setEmail(search.trim())}
                onBlur={() => setEmail(search.trim())}
                placeholder="Tìm theo email… (Enter)"
                className="h-9 w-56 pl-8"
              />
            </div>
            {/* Lọc vai trò */}
            <div className="flex items-center rounded-lg border p-0.5">
              {(
                [
                  ["", "Tất cả"],
                  ["CUSTOMER", "Khách hàng"],
                  ["STAFF", "Nhân viên"],
                  ["ADMIN", "Quản trị"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={label}
                  size="sm"
                  variant={roleFilter === value ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setRoleFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button variant={showDeleted ? "default" : "outline"} size="sm" onClick={() => setShowDeleted((v) => !v)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {showDeleted ? "Đang xem: Đã xóa" : "Thùng rác"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMailOpen(true)}>
              <Mail className="mr-1.5 h-4 w-4" />
              {selectedIds.size > 0 ? `Gửi email (${selectedIds.size})` : "Gửi email tất cả"}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Thêm người dùng
            </Button>
          </div>
        }
        columns={[
          {
            key: "select",
            header: "",
            className: "w-10",
            render: (u) => (
              <Checkbox
                checked={selectedIds.has(u.id)}
                onCheckedChange={() => toggleSelect(u.id)}
                aria-label={`Chọn ${u.email}`}
              />
            ),
          },
          {
            key: "name",
            header: "Tên",
            render: (u) => (
              <p className="font-medium">
                {u.name}
                {u.isRoot && (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    ROOT
                  </span>
                )}
              </p>
            ),
          },
          { key: "email", header: "Email", render: (u) => u.email },
          {
            key: "role",
            header: "Vai trò",
            className: "w-40",
            render: (u) =>
              showDeleted ? (
                <span className="text-sm text-muted-foreground">{u.role}</span>
              ) : (
                <Select
                  value={u.role}
                  onValueChange={async (role) => {
                    if (role === u.role) return;
                    try {
                      await updateRole.mutateAsync({ id: u.id, role: role as AdminUser["role"] });
                      toast.success(`Đã đổi vai trò → ${role}`);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Đổi vai trò thất bại");
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
          },
          { key: "createdAt", header: "Tạo", render: (u) => new Date(u.createdAt).toLocaleDateString("vi-VN") },
          {
            key: "actions",
            header: "",
            className: "text-right w-36",
            render: (u) =>
              showDeleted ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await restoreUser.mutateAsync(u.id);
                      toast.success(`Đã khôi phục ${u.email}`);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Khôi phục thất bại");
                    }
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Khôi phục
                </Button>
              ) : u.isRoot ? (
                <span className="text-xs text-muted-foreground">Tài khoản tối cao</span>
              ) : (
                <div className="flex items-center justify-end gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Sửa tên"
                    title="Sửa tên hiển thị"
                    onClick={() => {
                      setEditUser(u);
                      setEditName(u.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Đặt lại mật khẩu"
                    title="Đặt lại mật khẩu"
                    onClick={() => {
                      setPwUser(u);
                      setNewPassword("");
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Xóa"
                    title="Xóa (soft-delete)"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Xóa tài khoản?",
                        description: `Soft-delete tài khoản "${u.email}". Có thể khôi phục trong Thùng rác.`,
                        confirmText: "Xóa tài khoản",
                        variant: "destructive",
                      });
                      if (!ok) return;
                      try {
                        await softDelete.mutateAsync(u.id);
                        toast.success("Đã xóa — xem trong Thùng rác để khôi phục");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Xóa thất bại");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ),
          },
        ]}
      />

      {/* ── Dialog: gửi email hàng loạt ───────────────────────────── */}
      <SendMailDialog
        open={mailOpen}
        onOpenChange={setMailOpen}
        userIds={[...selectedIds]}
        recipientLabel={
          selectedIds.size > 0 ? `${selectedIds.size} người được chọn` : "TẤT CẢ người dùng đang hoạt động"
        }
      />

      {/* ── Dialog: tạo tài khoản mới ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người dùng</DialogTitle>
            <DialogDescription>
              Tạo tài khoản nhân viên hoặc khách hàng, đăng nhập bằng email/mật khẩu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="nhanvien@vhdcorp.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Tên hiển thị</Label>
              <Input
                placeholder="Nguyễn Văn A"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mật khẩu (≥ 6 ký tự)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Vai trò</Label>
                <Select
                  value={form.role}
                  onValueChange={(role) => setForm((f) => ({ ...f, role: role as AdminUser["role"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void submitCreate()} disabled={createUser.isPending}>
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: sửa tên ───────────────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sửa tên hiển thị</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Tên hiển thị" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Hủy
            </Button>
            <Button onClick={() => void submitEditName()} disabled={updateUser.isPending || !editName.trim()}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: đặt lại mật khẩu ──────────────────────────────── */}
      <Dialog open={!!pwUser} onOpenChange={(open) => !open && setPwUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Đặt mật khẩu mới cho <b>{pwUser?.email}</b> — user sẽ bị đăng xuất khỏi các phiên cũ.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mật khẩu mới (≥ 6 ký tự)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>
              Hủy
            </Button>
            <Button onClick={() => void submitResetPassword()} disabled={resetPassword.isPending}>
              Đặt lại mật khẩu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
