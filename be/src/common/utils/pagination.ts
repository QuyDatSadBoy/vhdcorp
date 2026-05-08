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

export function buildPaginationParams(
  pageNumber?: string | number,
  pageSize?: string | number,
): { page: number; limit: number; skip: number; take: number } {
  const page = Number(pageNumber) > 0 ? Number(pageNumber) : 1;
  const rawLimit = Number(pageSize) > 0 ? Number(pageSize) : 16;
  const limit = Math.min(rawLimit, 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
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
