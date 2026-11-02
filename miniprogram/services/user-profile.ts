import { http } from '../utils/http/index'
import type { ApiResponse } from '../utils/http/index'

interface UserProfile {
  avatar: string | null
  nickname: string | null
  birth_date: string | null
}

interface UpdateUserProfileParams {
  avatar?: string
  nickname?: string
  birth_date?: string
}

const getUserProfile = (): Promise<ApiResponse<UserProfile>> => {
  return http<UserProfile>({
    url: '/users/profile',
  })
}

const updateUserProfile = (
  params: UpdateUserProfileParams,
): Promise<ApiResponse<UserProfile>> => {
  return http<UserProfile>({
    url: '/users/profile',
    method: 'PATCH',
    params: { ...params },
  })
}

export { getUserProfile, updateUserProfile }
export type { UpdateUserProfileParams, UserProfile }
