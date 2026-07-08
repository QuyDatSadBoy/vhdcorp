/**
 * Helper trả về kết quả pagination chuẩn cho mọi domain.
 * Ưu tiên gọi DB count + findMany song song để tối ưu.
 */
export interface PaginatedResult<T> {
  records: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Chấp nhận cả `pageNumber/pageSize` (legacy) và `page/limit` (alias chuẩn REST).
 * Ưu tiên giá trị nào được truyền vào trước (legacy giữ ưu tiên để khỏi breaking).
 */
export function buildPaginationParams(
  pageNumberOrPage?: string | number,
  pageSizeOrLimit?: string | number,
  fallbackPage?: string | number,
  fallbackLimit?: string | number,
): { page: number; limit: number; skip: number; take: number } {
  const rawPage =
    Number(pageNumberOrPage) > 0
      ? Number(pageNumberOrPage)
      : Number(fallbackPage) > 0
        ? Number(fallbackPage)
        : 1;
  const rawSize =
    Number(pageSizeOrLimit) > 0
      ? Number(pageSizeOrLimit)
      : Number(fallbackLimit) > 0
        ? Number(fallbackLimit)
        : 16;
  const limit = Math.min(rawSize, 100);
  return { page: rawPage, limit, skip: (rawPage - 1) * limit, take: limit };
}

export function toPaginated<T>(
  records: T[],
  totalItems: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    records,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    currentPage: page,
    pageSize: limit,
  };
}
