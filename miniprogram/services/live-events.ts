import { http } from '../utils/http'
import type { ApiResponse } from '../utils/http'
import type { PaginationParams, PaginationResult } from './common'

type LiveEventStatus = 'published'
type ReservationStatus = 'reserved' | 'cancelled' | ''

interface LiveEvent {
  event_no: string
  source_provider: string
  external_live_id: string
  title: string
  host_name: string
  description: string
  display_time_text: string
  h5_url: string
  mini_program_app_id: string
  mini_program_path: string
  start_at: string
  end_at: string
  status: LiveEventStatus
  lock_version: number
  reservation_status: ReservationStatus
}

interface LiveEventList extends PaginationResult {
  items: LiveEvent[]
}

interface ReserveLiveEventParams {
  subscription_accept_count: 0 | 1 | 2
}

interface LiveEventReservation {
  reservation_no: string
  status: 'reserved'
  subscription_accept_count: number
  reserved_at: string
  created_at: string
  updated_at: string
}

interface CancelLiveEventReservationResult {
  cancelled: boolean
}

const getLiveEvents = (
  params: PaginationParams = {},
): Promise<ApiResponse<LiveEventList>> => {
  return http<LiveEventList>({
    url: '/live-events',
    params: { ...params },
  })
}

const getLiveEvent = (eventNo: string): Promise<ApiResponse<LiveEvent>> => {
  return http<LiveEvent>({
    url: `/live-events/${encodeURIComponent(eventNo)}`,
  })
}

const reserveLiveEvent = (
  eventNo: string,
  params: ReserveLiveEventParams,
): Promise<ApiResponse<LiveEventReservation>> => {
  return http<LiveEventReservation>({
    url: `/live-events/${encodeURIComponent(eventNo)}/reservation`,
    method: 'PUT',
    params: { ...params },
  })
}

const cancelLiveEventReservation = (
  eventNo: string,
): Promise<ApiResponse<CancelLiveEventReservationResult>> => {
  return http<CancelLiveEventReservationResult>({
    url: `/live-events/${encodeURIComponent(eventNo)}/reservation`,
    method: 'DELETE',
  })
}

export {
  cancelLiveEventReservation,
  getLiveEvent,
  getLiveEvents,
  reserveLiveEvent,
}
export type {
  CancelLiveEventReservationResult,
  LiveEvent,
  LiveEventList,
  LiveEventReservation,
  LiveEventStatus,
  ReservationStatus,
  ReserveLiveEventParams,
}
