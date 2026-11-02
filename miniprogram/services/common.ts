interface PaginationParams {
  page?: number
  page_size?: number
}

interface PaginationResult {
  page: number
  page_size: number
  total: number
}

export type { PaginationParams, PaginationResult }
