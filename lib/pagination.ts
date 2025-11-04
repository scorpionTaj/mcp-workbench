/**
 * Pagination Utility for API Responses
 *
 * Provides consistent pagination across all API routes
 * to reduce payload sizes and improve performance.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Parse pagination parameters from request
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {}
): Required<Pick<PaginationParams, "page" | "limit">> {
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || String(defaults.page || 1), 10)
  );
  const limit = Math.min(
    100, // Max 100 items per page
    Math.max(
      1,
      parseInt(searchParams.get("limit") || String(defaults.limit || 50), 10)
    )
  );

  return { page, limit };
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Paginate an array of items
 */
export function paginateArray<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    data: paginatedItems,
    meta: getPaginationMeta(page, limit, items.length),
  };
}

/**
 * Paginate Prisma query results
 */
export interface PrismaPageParams {
  page: number;
  limit: number;
}

export function getPrismaPageParams(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const take = limit;

  return { skip, take };
}

/**
 * Create paginated response from Prisma results
 */
export async function paginatePrismaQuery<T>(
  queryFn: (skip: number, take: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  page: number,
  limit: number
): Promise<PaginatedResponse<T>> {
  const { skip, take } = getPrismaPageParams(page, limit);

  // Execute count and query in parallel
  const [total, data] = await Promise.all([countFn(), queryFn(skip, take)]);

  return {
    data,
    meta: getPaginationMeta(page, limit, total),
  };
}

/**
 * Field filtering utility
 * Allows clients to specify which fields they want
 */
export function parseFieldsParam(
  searchParams: URLSearchParams
): string[] | null {
  const fields = searchParams.get("fields");
  if (!fields) return null;

  return fields
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

/**
 * Filter object fields based on requested fields
 */
export function filterFields<T extends Record<string, any>>(
  obj: T,
  fields: string[] | null
): Partial<T> {
  if (!fields || fields.length === 0) return obj;

  const filtered: Partial<T> = {};
  for (const field of fields) {
    if (field in obj) {
      filtered[field as keyof T] = obj[field];
    }
  }

  return filtered;
}

/**
 * Filter array of objects
 */
export function filterArrayFields<T extends Record<string, any>>(
  items: T[],
  fields: string[] | null
): Partial<T>[] {
  if (!fields || fields.length === 0) return items;

  return items.map((item) => filterFields(item, fields));
}
