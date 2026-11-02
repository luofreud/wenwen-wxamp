import { http } from '../utils/http/index'
import type { ApiResponse } from '../utils/http/index'
import type { PaginationParams } from './common'

type StarCoinChangeType = 1 | 2

interface StarCoinRecordParams extends PaginationParams {
  change_type?: StarCoinChangeType
}

interface StarCoinRecord {
  id: number
  change_type: StarCoinChangeType
  change_amount: number
  balance_before: number
  balance_after: number
  business_type: string
  business_id: number
  description: string
  created_at: string
}

interface StarCoinMonthlySummary {
  month: string
  increased_star_coins: number
  consumed_star_coins: number
}

interface StarCoinRecordList {
  list: StarCoinRecord[]
  total: number
  page: number
  page_size: number
  monthly_summary: StarCoinMonthlySummary
}

const getStarCoinRecords = (
  params: StarCoinRecordParams = {},
): Promise<ApiResponse<StarCoinRecordList>> => {
  return http<StarCoinRecordList>({
    url: '/star-coins/records',
    params: { ...params },
  })
}

export { getStarCoinRecords }
export type {
  StarCoinChangeType,
  StarCoinMonthlySummary,
  StarCoinRecord,
  StarCoinRecordList,
  StarCoinRecordParams,
}
