import { getUserProfile, updateUserProfile } from '../services/user-profile'
import type {
  UpdateUserProfileParams,
  UserProfile,
} from '../services/user-profile'

interface UserProfileState {
  profile: UserProfile | null
  isLoading: boolean
  isUpdating: boolean
  error: string
}

type UserProfileStoreListener = (state: Readonly<UserProfileState>) => void

const isNullableString = (value: unknown): value is string | null => {
  return value === null || typeof value === 'string'
}

const isUserProfile = (value: unknown): value is UserProfile => {
  if (typeof value !== 'object' || value === null) return false

  const profile = value as Record<string, unknown>
  return (
    isNullableString(profile.avatar) &&
    isNullableString(profile.nickname) &&
    isNullableString(profile.birth_date)
  )
}

class UserProfileStore {
  private state: UserProfileState = {
    profile: null,
    isLoading: false,
    isUpdating: false,
    error: '',
  }

  private refreshPromise: Promise<UserProfile> | null = null
  private updatePromise: Promise<UserProfile> | null = null
  private initialized = false
  private readonly listeners = new Set<UserProfileStoreListener>()

  getSnapshot(): Readonly<UserProfileState> {
    return {
      ...this.state,
      profile: this.state.profile ? { ...this.state.profile } : null,
    }
  }

  subscribe(listener: UserProfileStoreListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())

    return () => {
      this.listeners.delete(listener)
    }
  }

  init(): Promise<UserProfile> {
    if (this.initialized && this.state.profile) {
      return Promise.resolve({ ...this.state.profile })
    }

    return this.refresh()
  }

  refresh(): Promise<UserProfile> {
    if (this.refreshPromise) return this.refreshPromise
    if (this.updatePromise) return this.updatePromise

    this.state.isLoading = true
    this.state.error = ''
    this.notify()

    const request = getUserProfile()
      .then((response) => {
        if (response.code !== 200) {
          throw new Error(response.msg || '资料加载失败')
        }
        if (!isUserProfile(response.data)) {
          throw new Error('用户资料格式不正确')
        }

        this.state.profile = { ...response.data }
        this.initialized = true
        return { ...response.data }
      })
      .catch((error: unknown) => {
        this.state.error = error instanceof Error
          ? error.message
          : '网络开小差了，请稍后重试'
        throw error
      })
      .finally(() => {
        this.state.isLoading = false
        this.refreshPromise = null
        this.notify()
      })

    this.refreshPromise = request
    return request
  }

  update(params: UpdateUserProfileParams): Promise<UserProfile> {
    if (this.updatePromise) return this.updatePromise

    const request = this.runUpdate(params)
    this.updatePromise = request
    return request
  }

  clear(): void {
    this.state = {
      profile: null,
      isLoading: false,
      isUpdating: false,
      error: '',
    }
    this.refreshPromise = null
    this.updatePromise = null
    this.initialized = false
    this.notify()
  }

  private async runUpdate(params: UpdateUserProfileParams): Promise<UserProfile> {
    this.state.isUpdating = true
    this.notify()

    try {
      if (this.refreshPromise) await this.refreshPromise

      const response = await updateUserProfile(params)
      if (response.code !== 200) {
        throw new Error(response.msg || '资料更新失败，请重试')
      }
      if (!isUserProfile(response.data)) {
        throw new Error('用户资料格式不正确')
      }

      this.state.profile = { ...response.data }
      this.initialized = true
      this.state.error = ''
      this.notify()
      return { ...response.data }
    } finally {
      this.state.isUpdating = false
      this.updatePromise = null
      this.notify()
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

const userProfileStore = new UserProfileStore()

export { userProfileStore }
export type { UserProfileState, UserProfileStoreListener }
