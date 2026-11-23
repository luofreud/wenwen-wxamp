import { http, upload } from '../utils/http/index'
import type { ApiResponse } from '../utils/http/index'

interface UserProfile {
  avatar: string | null
  avatar_url?: string
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

const uploadUserAvatar = async (filePath: string): Promise<ApiResponse<UserProfile>> => {
  const response = await upload<{ profile: UserProfile }>('/users/profile/avatar', filePath)
  if (response.code !== 200) throw new Error(response.msg || '头像上传失败')
  if (!response.data?.profile) throw new Error('头像上传响应格式不正确')
  return { ...response, data: response.data.profile }
}

export { getUserProfile, updateUserProfile, uploadUserAvatar }
export type { UpdateUserProfileParams, UserProfile }
