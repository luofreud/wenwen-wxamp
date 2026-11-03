import { http } from '../utils/http/index'
import type { ApiResponse } from '../utils/http/index'

interface RewardCycleItem {
  cycle_day: number
  reward_star_coins: number
}

interface RewardMilestone {
  target_day: number
  reward_star_coins: number
}

interface CheckInStatus {
  has_checked_in: boolean
  checkin_date: string
  total_days: number
  consecutive_days: number
  current_cycle_day: number
  reward_round: number
  reward_progress_day: number
  reward_round_length: number
  today_reward_star_coins: number
  star_coin_balance: number
  checked_in_at: string | null
  reward_cycle: RewardCycleItem[]
  reward_milestones: RewardMilestone[]
}

interface CheckInResult extends CheckInStatus {
  already_checked_in: boolean
}

const checkIn = (): Promise<ApiResponse<CheckInResult>> => {
  return http<CheckInResult>({
    url: '/check-ins',
    method: 'POST',
    params: {},
  })
}

const getTodayCheckIn = (): Promise<ApiResponse<CheckInStatus>> => {
  return http<CheckInStatus>({
    url: '/check-ins/today',
  })
}

export { checkIn, getTodayCheckIn }
export type {
  CheckInResult,
  CheckInStatus,
  RewardCycleItem,
  RewardMilestone,
}
