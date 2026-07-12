import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { PaginatedResult } from "@/types/domain";

export type ContactStatus = "NEW" | "HANDLED";

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export const contactKeys = {
  admin: (params?: Record<string, unknown>) => ["contacts", "admin", params] as const,
};

export const contactService = {
  submit: (payload: { name: string; email: string; phone?: string; subject?: string; message: string }) =>
    axios.post<{ data: { id: number; message: string } }>("/contact", payload).then(unwrap),
  adminList: (params?: { pageNumber?: number; pageSize?: number; status?: ContactStatus }) =>
    axios.get<{ data: PaginatedResult<ContactMessage> }>("/contact/admin", { params }).then(unwrap),
  setStatus: (id: number, status: ContactStatus) =>
    axios.put<{ data: ContactMessage }>(`/contact/${id}/status`, { status }).then(unwrap),
  remove: (id: number) => axios.delete(`/contact/${id}`).then(() => undefined),
};

export function useAdminContacts(params?: { status?: ContactStatus; pageNumber?: number; pageSize?: number }) {
  return useQuery({ queryKey: contactKeys.admin(params), queryFn: () => contactService.adminList(params) });
}

export function useSetContactStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContactStatus }) => contactService.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
