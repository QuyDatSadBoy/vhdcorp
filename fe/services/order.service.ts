import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { Order, OrderStatus, Voucher } from "@/types/domain";

export interface CreateOrderPayload {
  name: string;
  email: string;
  phone: string;
  address: string;
  note?: string;
  voucherCode?: string;
  items: { productId: number; qty: number }[];
}

export const orderKeys = {
  all: ["orders"] as const,
  admin: (page: number, status?: string) => ["orders", "admin", page, status ?? "all"] as const,
  mine: ["orders", "mine"] as const,
};

export const orderService = {
  create: (payload: CreateOrderPayload) => axios.post<{ data: Order }>("/orders", payload).then(unwrap),
  adminList: (page = 1, status?: OrderStatus) =>
    axios
      .get<{ data: { records: Order[]; totalItems: number; totalPages: number } }>("/orders", {
        params: { page, pageSize: 20, status },
      })
      .then(unwrap),
  updateStatus: (id: number, status: OrderStatus) =>
    axios.put<{ data: Order }>(`/orders/${id}/status`, { status }).then(unwrap),
  mine: () => axios.get<{ data: Order[] }>("/orders/mine").then(unwrap),
  validateVoucher: (code: string, subtotal: number) =>
    axios.post<{ data: { code: string; discount: number } }>("/vouchers/validate", { code, subtotal }).then(unwrap),
};

export function useCreateOrder() {
  return useMutation({ mutationFn: orderService.create });
}

export function useAdminOrders(page = 1, status?: OrderStatus) {
  return useQuery({ queryKey: orderKeys.admin(page, status), queryFn: () => orderService.adminList(page, status) });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => orderService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useMyOrders(enabled: boolean) {
  return useQuery({ queryKey: orderKeys.mine, queryFn: orderService.mine, enabled });
}

/* ── Voucher admin CRUD ── */
export const voucherService = {
  list: () => axios.get<{ data: Voucher[] }>("/vouchers").then(unwrap),
  create: (payload: Partial<Voucher>) => axios.post<{ data: Voucher }>("/vouchers", payload).then(unwrap),
  update: (id: number, payload: Partial<Voucher>) =>
    axios.put<{ data: Voucher }>(`/vouchers/${id}`, payload).then(unwrap),
  remove: (id: number) => axios.delete(`/vouchers/${id}`).then(() => undefined),
};

export function useAdminVouchers() {
  return useQuery({ queryKey: ["vouchers", "admin"], queryFn: voucherService.list });
}

export function useSaveVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Partial<Voucher> }) =>
      id ? voucherService.update(id, payload) : voucherService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vouchers"] }),
  });
}

export function useDeleteVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: voucherService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vouchers"] }),
  });
}
