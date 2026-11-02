import { http } from '../utils/http/index'
import type { ApiResponse } from '../utils/http/index'
import type { PaginationParams, PaginationResult } from './common'

type AssessmentTypeStatus = 'active'
type AssessmentProviderMode = 'mock' | 'external'
type AssessmentStatus = 'requesting' | 'succeeded' | 'failed'

interface AssessmentInputSchema {
  archive_count: number
  allow_input_fields: string[]
}

interface AssessmentType {
  type_no: string
  type_code: string
  title: string
  short_title: string
  description: string
  cover_object_key: string
  category_code: string
  tags: string[]
  estimated_duration_seconds: number
  daily_quota_cost: number
  input_schema: AssessmentInputSchema
  result_schema_version: number
  status: AssessmentTypeStatus
  sort: number
  content_version: number
  lock_version: number
  published_at: string
}

interface CreateAssessmentParams {
  client_request_id: string
  type_code: string
  archive_ids: number[]
}

interface Assessment {
  request_no: string
  client_request_id: string
  type_code: string
  type_content_version: number
  title: string
  cover_object_key: string
  archive_ids: number[]
  provider_mode: AssessmentProviderMode
  is_mock: boolean
  result_summary: Record<string, unknown>
  result_data: Record<string, unknown>
  status: AssessmentStatus
  quota_date: string
  requested_at: string
  completed_at: string | null
  expires_at: string
  created_at: string
}

interface AssessmentListItem {
  request_no: string
  type_code: string
  title: string
  provider_mode: AssessmentProviderMode
  is_mock: boolean
  status: AssessmentStatus
  created_at: string
}

interface AssessmentList extends PaginationResult {
  items: AssessmentListItem[]
}

interface AssessmentQuota {
  date: string
  limit: number
  used: number
  remaining: number
}

const getAssessmentTypes = (): Promise<ApiResponse<AssessmentType[]>> => {
  return http<AssessmentType[]>({
    url: '/assessment-types',
  })
}

const getAssessmentType = (
  typeCode: string,
): Promise<ApiResponse<AssessmentType>> => {
  return http<AssessmentType>({
    url: `/assessment-types/${encodeURIComponent(typeCode)}`,
  })
}

const createAssessment = (
  params: CreateAssessmentParams,
): Promise<ApiResponse<Assessment>> => {
  return http<Assessment>({
    url: '/assessments',
    method: 'POST',
    params: { ...params },
  })
}

const getAssessments = (
  params: PaginationParams = {},
): Promise<ApiResponse<AssessmentList>> => {
  return http<AssessmentList>({
    url: '/assessments',
    params: { ...params },
  })
}

const getAssessment = (
  requestNo: string,
): Promise<ApiResponse<Assessment>> => {
  return http<Assessment>({
    url: `/assessments/${encodeURIComponent(requestNo)}`,
  })
}

const getAssessmentQuota = (): Promise<ApiResponse<AssessmentQuota>> => {
  return http<AssessmentQuota>({
    url: '/assessments/quota',
  })
}

export {
  createAssessment,
  getAssessment,
  getAssessmentQuota,
  getAssessments,
  getAssessmentType,
  getAssessmentTypes,
}
export type {
  Assessment,
  AssessmentInputSchema,
  AssessmentList,
  AssessmentListItem,
  AssessmentProviderMode,
  AssessmentQuota,
  AssessmentStatus,
  AssessmentType,
  AssessmentTypeStatus,
  CreateAssessmentParams,
}
