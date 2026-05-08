import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { CloudinarySignedUpload, Media, PaginatedResult } from "@/types/domain";

export const mediaKeys = {
  all: ["media"] as const,
  list: (params?: ListParams) => ["media", "list", params] as const,
};

interface ListParams {
  pageNumber?: number;
  pageSize?: number;
  folder?: string;
  tag?: string;
}

export const mediaService = {
  list: (params?: ListParams) =>
    axios.get<{ data: PaginatedResult<Media> }>("/media", { params }).then(unwrap),
  signUpload: (folder: string, publicId?: string) =>
    axios
      .post<{ data: CloudinarySignedUpload }>("/media/sign", { folder, publicId })
      .then(unwrap),
  saveMeta: (payload: Partial<Media>) =>
    axios.post<{ data: Media }>("/media", payload).then(unwrap),
  remove: (id: number) => axios.delete(`/media/${id}`).then(() => undefined),
};

/**
 * Upload ảnh — gửi multipart trực tiếp tới BE.
 * BE tự xử lý: thử Cloudinary trước, fallback lưu local /uploads.
 * UX: admin chỉ chọn file, không cần biết storage backend.
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
): Promise<Media> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await axios.post<{ data: Media }>("/media/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export function useMediaList(params?: ListParams) {
  return useQuery({ queryKey: mediaKeys.list(params), queryFn: () => mediaService.list(params) });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mediaService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}
