import {
  checkIn as checkInRequest,
  getTodayCheckIn,
} from '../services/check-ins'
import type {
  CheckInResult,
  CheckInStatus,
} from '../services/check-ins'

interface CheckInState {
  status: CheckInStatus | null
  isLoading: boolean
  isCheckingIn: boolean
  error: string
}

interface CheckInSubmission {
  status: CheckInStatus
  performed: boolean
}

type CheckInStoreListener = (state: Readonly<CheckInState>) => void

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value)
}

const isCheckInStatus = (value: unknown): value is CheckInStatus => {
  if (typeof value !== 'object' || value === null) return false
  const status = value as Record<string, unknown>

  return (
    typeof status.has_checked_in === 'boolean' &&
    isFiniteNumber(status.current_cycle_day) &&
    isFiniteNumber(status.star_coin_balance) &&
    Array.isArray(status.reward_cycle) &&
    status.reward_cycle.length > 0 &&
    Array.isArray(status.reward_milestones)
  )
}

const cloneStatus = (status: CheckInStatus): CheckInStatus => {
  return {
    ...status,
    reward_cycle: status.reward_cycle.map((item) => ({ ...item })),
    reward_milestones: status.reward_milestones.map((item) => ({ ...item })),
  }
}

const isSuccessCode = (code: number): boolean => {
  return code === 0 || code === 200
}

const getLocalDateKey = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

class CheckInStore {
  private state: CheckInState = {
    status: null,
    isLoading: false,
    isCheckingIn: false,
    error: '',
  }

  private refreshPromise: Promise<CheckInStatus> | null = null
  private checkInPromise: Promise<CheckInSubmission> | null = null
  private loadedDateKey = ''
  private readonly listeners = new Set<CheckInStoreListener>()

  getSnapshot(): Readonly<CheckInState> {
    return {
      ...this.state,
      status: this.state.status ? cloneStatus(this.state.status) : null,
    }
  }

  subscribe(listener: CheckInStoreListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())

    return () => {
      this.listeners.delete(listener)
    }
  }

  init(): Promise<CheckInStatus> {
    if (this.state.status && this.loadedDateKey === getLocalDateKey()) {
      return Promise.resolve(cloneStatus(this.state.status))
    }

    return this.refresh()
  }

  refresh(): Promise<CheckInStatus> {
    if (this.refreshPromise) return this.refreshPromise
    if (this.checkInPromise) {
      return this.checkInPromise.then(({ status }) => cloneStatus(status))
    }

    this.state.isLoading = true
    this.state.error = ''
    this.notify()

    const request = getTodayCheckIn()
      .then((response) => {
        if (!isSuccessCode(response.code)) {
          throw new Error(response.msg || '获取签到信息失败，请稍后重试')
        }
        if (!isCheckInStatus(response.data)) {
          throw new Error('签到数据格式不正确')
        }

        this.state.status = cloneStatus(response.data)
        this.loadedDateKey = getLocalDateKey()
        return cloneStatus(response.data)
      })
      .catch((error: unknown) => {
        this.state.error = error instanceof Error
          ? error.message
          : '获取签到信息失败，请稍后重试'
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

  submit(): Promise<CheckInSubmission> {
    if (this.checkInPromise) return this.checkInPromise
    if (this.state.status?.has_checked_in) {
      return Promise.resolve({
        status: cloneStatus(this.state.status),
        performed: false,
      })
    }

    this.state.isCheckingIn = true
    this.notify()

    const request = this.runSubmit()
    this.checkInPromise = request
    return request
  }

  clear(): void {
    this.state = {
      status: null,
      isLoading: false,
      isCheckingIn: false,
      error: '',
    }
    this.refreshPromise = null
    this.checkInPromise = null
    this.loadedDateKey = ''
    this.notify()
  }

  private async runSubmit(): Promise<CheckInSubmission> {
    try {
      if (this.refreshPromise) {
        await this.refreshPromise
      } else if (!this.state.status) {
        await this.refresh()
      }
      if (this.state.status?.has_checked_in) {
        return {
          status: cloneStatus(this.state.status),
          performed: false,
        }
      }

      const response = await checkInRequest()
      if (!isSuccessCode(response.code)) {
        throw new Error(response.msg || '签到失败，请稍后重试')
      }
      if (!isCheckInResult(response.data)) {
        throw new Error('签到数据格式不正确')
      }

      this.state.status = cloneStatus(response.data)
      this.loadedDateKey = getLocalDateKey()
      this.state.error = ''
      this.notify()
      return {
        status: cloneStatus(response.data),
        performed: !response.data.already_checked_in,
      }
    } finally {
      this.state.isCheckingIn = false
      this.checkInPromise = null
      this.notify()
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

const isCheckInResult = (value: unknown): value is CheckInResult => {
  return (
    isCheckInStatus(value) &&
    typeof (value as CheckInResult).already_checked_in === 'boolean'
  )
}

const checkInStore = new CheckInStore()

export { checkInStore }
export type { CheckInState, CheckInStoreListener, CheckInSubmission }
