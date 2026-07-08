"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useAdminUsers, useUpdateUserRole, useSoftDeleteUser } from "@/services/user.service";
import { AdminTable } from "@/components/admin/admin-table";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminUser } from "@/types/domain";

const ROLES: AdminUser["role"][] = ["ADMIN", "STAFF", "CUSTOMER"];

export default function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const softDelete = useSoftDeleteUser();
  const confirm = useConfirm();
  const rows = data?.records ?? [];

  return (
    <AdminTable
      title="Người dùng"
      description="Đổi vai trò hoặc soft-delete tài khoản. Không thể tự thao tác trên chính mình."
      isLoading={isLoading}
      rows={rows}
      columns={[
        { key: "name", header: "Tên", render: (u) => <p className="font-medium">{u.name}</p> },
        { key: "email", header: "Email", render: (u) => u.email },
        {
          key: "role",
          header: "Vai trò",
          className: "w-40",
          render: (u) => (
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
          className: "text-right w-20",
          render: (u) => (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Xóa"
              onClick={async () => {
                const ok = await confirm({
                  title: "Xóa tài khoản?",
                  description: `Soft-delete tài khoản "${u.email}". Tài khoản có thể được khôi phục thủ công sau.`,
                  confirmText: "Xóa tài khoản",
                  variant: "destructive",
                });
                if (!ok) return;
                try {
                  await softDelete.mutateAsync(u.id);
                  toast.success("Đã xóa");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Xóa thất bại");
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          ),
        },
      ]}
    />
  );
}
