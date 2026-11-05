import { http } from '../utils/http/index'
import type { ApiResponse } from '../utils/http/index'

interface DictionaryItemExtra {
  utc_offset?: string
  [key: string]: unknown
}

interface DictionaryItem {
  id: number
  dict_type_id: number
  dict_type_name: string
  dict_type_code: string
  label: string
  value: string
  description: string
  is_default: 0 | 1
  status: 0 | 1
  sort: number
  extra: DictionaryItemExtra | null
  created_at: string
  updated_at: string
}

const getDictionaryItems = (
  dictTypeCode: string,
): Promise<ApiResponse<DictionaryItem[]>> => {
  return http<DictionaryItem[]>({
    url: '/api/wechat/v1/dictionary/items',
    params: {
      dict_type_code: dictTypeCode,
    },
  })
}

const getTimezoneDictionaryItems = (): Promise<ApiResponse<DictionaryItem[]>> => {
  return getDictionaryItems('timezone')
}

export { getDictionaryItems, getTimezoneDictionaryItems }
export type { DictionaryItem, DictionaryItemExtra }
