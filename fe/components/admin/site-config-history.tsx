"use client";

import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { useSiteConfigHistory, useRollbackSiteConfig } from "@/services/site-config.service";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Tab Lịch sử: danh sách các phiên bản cấu hình + nút khôi phục về bản nháp. */
export default function SiteConfigHistory() {
  const { data, isLoading } = useSiteConfigHistory();
  const rollback = useRollbackSiteConfig();

  async function handleRestore(historyId: number) {
    try {
      await rollback.mutateAsync(historyId);
      toast.success("Đã khôi phục vào bản nháp — bấm Xuất bản để áp dụng");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Khôi phục thất bại");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Đang tải lịch sử...</p>;
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground p-4">Chưa có lịch sử phiên bản nào.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Phiên bản</TableHead>
          <TableHead>Thời gian lưu</TableHead>
          <TableHead className="w-32 text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((h) => (
          <TableRow key={h.id}>
            <TableCell className="font-medium">v{h.version}</TableCell>
            <TableCell>{new Date(h.createdAt).toLocaleString("vi-VN")}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" disabled={rollback.isPending} onClick={() => handleRestore(h.id)}>
                {rollback.isPending && rollback.variables === h.id ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                )}
                Khôi phục
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
