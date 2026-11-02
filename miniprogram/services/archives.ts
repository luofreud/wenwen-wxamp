import { http } from '../utils/http'
import type { ApiResponse } from '../utils/http'

type Gender = 0 | 1 | 2
type DaylightSaving = 0 | 1

interface ArchiveSummary {
  id: number
  name: string
  gender: Gender
  birth_time: string
  birth_place: string
  current_place: string
  timezone: number
  daylight_saving: DaylightSaving
}

interface Archive extends ArchiveSummary {
  birth_longitude: number | null
  birth_latitude: number | null
  current_longitude: number | null
  current_latitude: number | null
  remark: string
  created_at: string
  updated_at: string
}

interface CreateArchiveParams {
  name: string
  gender: Gender
  birth_time: string
  birth_place: string
  birth_longitude?: number
  birth_latitude?: number
  current_place: string
  current_longitude?: number
  current_latitude?: number
  timezone: number
  daylight_saving: DaylightSaving
  remark?: string
}

type UpdateArchiveParams = Partial<CreateArchiveParams>

const getArchives = (): Promise<ApiResponse<ArchiveSummary[]>> => {
  return http<ArchiveSummary[]>({
    url: '/archives',
  })
}

const createArchive = (
  params: CreateArchiveParams,
): Promise<ApiResponse<Archive>> => {
  return http<Archive>({
    url: '/archives',
    method: 'POST',
    params: { ...params },
  })
}

const updateArchive = (
  archiveId: number,
  params: UpdateArchiveParams,
): Promise<ApiResponse<Archive>> => {
  return http<Archive>({
    url: `/archives/${archiveId}`,
    method: 'PUT',
    params: { ...params },
  })
}

const deleteArchive = (archiveId: number): Promise<ApiResponse<null>> => {
  return http<null>({
    url: `/archives/${archiveId}`,
    method: 'DELETE',
  })
}

export { createArchive, deleteArchive, getArchives, updateArchive }
export type {
  Archive,
  ArchiveSummary,
  CreateArchiveParams,
  DaylightSaving,
  Gender,
  UpdateArchiveParams,
}
