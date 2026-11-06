// pages/mine/index.ts
import type {
  CheckInStatus,
  RewardCycleItem,
  RewardMilestone,
  UpdateUserProfileParams,
  UserProfile,
} from '../../services/index'
import { checkInStore, userProfileStore } from '../../stores/index'
import type {
  CheckInState,
  UserProfileState,
} from '../../stores/index'

interface GetUserInfoEvent {
  detail: {
    errMsg: string
    userInfo?: {
      avatarUrl: string
      nickName: string
    }
  }
}

interface CheckInDayView extends RewardCycleItem {
  bonusRewardStarCoins: number
  isChecked: boolean
  isCurrent: boolean
  isSeventh: boolean
  label: string
}

interface NextMilestoneView extends RewardMilestone {
  progressPercent: number
  remainingDays: number
}

interface ProfileZodiac {
  end: number
  icon: string
  name: string
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'red'
}

interface CycleDayTapEvent {
  currentTarget: {
    dataset: {
      canCheckIn?: boolean
    }
  }
}

interface MinePageRuntime {
  unsubscribeCheckIn: () => void
  unsubscribeProfile: () => void
}

const hasText = (value: string | null): boolean => {
  return Boolean(value?.trim())
}

const PROFILE_ZODIACS: ProfileZodiac[] = [
  { end: 120, name: '摩羯座', icon: '/assets/constellation/capricorn.svg', tone: 'blue' },
  { end: 219, name: '水瓶座', icon: '/assets/constellation/aquarius.svg', tone: 'blue' },
  { end: 320, name: '双鱼座', icon: '/assets/constellation/pisces.svg', tone: 'purple' },
  { end: 420, name: '白羊座', icon: '/assets/constellation/aries.svg', tone: 'red' },
  { end: 521, name: '金牛座', icon: '/assets/constellation/taurus.svg', tone: 'orange' },
  { end: 622, name: '双子座', icon: '/assets/constellation/gemini.svg', tone: 'green' },
  { end: 723, name: '巨蟹座', icon: '/assets/constellation/cancer.svg', tone: 'blue' },
  { end: 823, name: '狮子座', icon: '/assets/constellation/leo.svg', tone: 'orange' },
  { end: 923, name: '处女座', icon: '/assets/constellation/virgo.svg', tone: 'green' },
  { end: 1024, name: '天秤座', icon: '/assets/constellation/libra.svg', tone: 'purple' },
  { end: 1123, name: '天蝎座', icon: '/assets/constellation/scorpio.svg', tone: 'purple' },
  { end: 1222, name: '射手座', icon: '/assets/constellation/sagittarius.svg', tone: 'red' },
  { end: 1231, name: '摩羯座', icon: '/assets/constellation/capricorn.svg', tone: 'blue' },
]

const getProfileZodiac = (birthDate: string | null): ProfileZodiac | null => {
  if (!birthDate) return null

  const month = Number(birthDate.slice(5, 7))
  const day = Number(birthDate.slice(8, 10))
  const monthDay = month * 100 + day

  if (!Number.isFinite(monthDay) || monthDay < 101 || monthDay > 1231) {
    return null
  }

  return PROFILE_ZODIACS.find(({ end }) => monthDay <= end) ?? null
}

const getCycleDayLabel = (
  cycleDay: number,
  status: CheckInStatus,
  isChecked: boolean,
): string => {
  if (isChecked) return '已签到'
  if (!status.has_checked_in && cycleDay === status.current_cycle_day) return '今天'
  if (status.has_checked_in && cycleDay === status.current_cycle_day + 1) return '明天'
  return `第${cycleDay}天`
}

const toCheckInDays = (status: CheckInStatus): CheckInDayView[] => {
  const cycle = [...status.reward_cycle]
    .sort((left, right) => left.cycle_day - right.cycle_day)
    .slice(0, 7)

  return cycle.map((item, index) => {
    const isChecked = status.has_checked_in
      ? item.cycle_day <= status.current_cycle_day
      : item.cycle_day < status.current_cycle_day
    const isCurrent = item.cycle_day === status.current_cycle_day
    const rewardStarCoins = isCurrent
      ? status.today_reward_star_coins
      : item.reward_star_coins
    const previousReward = index > 0
      ? cycle[index - 1].reward_star_coins
      : rewardStarCoins

    return {
      ...item,
      reward_star_coins: rewardStarCoins,
      bonusRewardStarCoins: item.cycle_day === 7
        ? Math.max(rewardStarCoins - previousReward, 0)
        : 0,
      isChecked,
      isCurrent,
      isSeventh: item.cycle_day === 7,
      label: getCycleDayLabel(item.cycle_day, status, isChecked),
    }
  })
}

const getNextMilestone = (status: CheckInStatus): NextMilestoneView | null => {
  const completedProgress = status.has_checked_in
    ? status.reward_progress_day
    : Math.max(status.reward_progress_day - 1, 0)
  const milestone = [...status.reward_milestones]
    .sort((left, right) => left.target_day - right.target_day)
    .find(({ target_day }) => target_day > completedProgress)

  if (!milestone) return null

  return {
    ...milestone,
    remainingDays: milestone.target_day - completedProgress,
    progressPercent: Math.min(
      Math.round(completedProgress / milestone.target_day * 100),
      100,
    ),
  }
}

const minePageRuntime = new WeakMap<object, MinePageRuntime>()

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    titleBarRight: 0,
    profile: null as UserProfile | null,
    isProfileLoading: true,
    isProfileUpdating: false,
    profileError: '',
    isProfileEmpty: false,
    needsWechatInfo: false,
    profileZodiac: '',
    profileZodiacIcon: '',
    profileZodiacTone: 'blue' as ProfileZodiac['tone'],
    checkInStatus: null as CheckInStatus | null,
    checkInDays: [] as CheckInDayView[],
    nextMilestone: null as NextMilestoneView | null,
    isCheckInLoading: true,
    isCheckingIn: false,
    checkInError: '',
  },

  onLoad() {
    const runtime: MinePageRuntime = {
      unsubscribeCheckIn: checkInStore.subscribe((state) => {
        this.applyCheckInState(state)
      }),
      unsubscribeProfile: userProfileStore.subscribe((state) => {
        this.applyUserProfileState(state)
      }),
    }
    minePageRuntime.set(this, runtime)
    this.initNavigation()
  },

  onShow() {
    if (!this.data.navigationReady) {
      this.initNavigation()
    }
    void this.loadUserProfile()
    void this.loadCheckInStatus()
  },

  onUnload() {
    const runtime = minePageRuntime.get(this)
    runtime?.unsubscribeCheckIn()
    runtime?.unsubscribeProfile()
    minePageRuntime.delete(this)
  },

  initNavigation() {
    try {
      const windowInfo = wx.getWindowInfo()
      const menuButton = wx.getMenuButtonBoundingClientRect()
      const statusBarHeight = windowInfo.statusBarHeight
      const navigationBarHeight = menuButton.bottom + menuButton.top - statusBarHeight

      if (
        windowInfo.windowWidth <= 0 ||
        statusBarHeight < 0 ||
        menuButton.width <= 0 ||
        menuButton.height <= 0 ||
        navigationBarHeight <= statusBarHeight
      ) {
        return
      }

      this.setData({
        navigationReady: true,
        navigationBarHeight: Math.ceil(navigationBarHeight),
        statusBarHeight: Math.ceil(statusBarHeight),
        titleBarRight: Math.ceil(windowInfo.windowWidth - menuButton.left + 12),
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },

  setProfile(profile: UserProfile): void {
    const hasAvatar = hasText(profile.avatar)
    const hasNickname = hasText(profile.nickname)
    const hasBirthDate = hasText(profile.birth_date)
    const zodiac = getProfileZodiac(profile.birth_date)

    this.setData({
      profile,
      isProfileEmpty: !hasAvatar && !hasNickname && !hasBirthDate,
      needsWechatInfo: !hasAvatar || !hasNickname,
      profileZodiac: zodiac?.name ?? '',
      profileZodiacIcon: zodiac?.icon ?? '',
      profileZodiacTone: zodiac?.tone ?? 'blue',
    })
  },

  applyUserProfileState(state: Readonly<UserProfileState>): void {
    if (state.profile) {
      this.setProfile(state.profile)
    } else {
      this.setData({
        profile: null,
        isProfileEmpty: false,
        needsWechatInfo: false,
        profileZodiac: '',
        profileZodiacIcon: '',
        profileZodiacTone: 'blue',
      })
    }

    this.setData({
      isProfileLoading: !state.profile && (state.isLoading || !state.error),
      isProfileUpdating: state.isUpdating,
      profileError: state.profile ? '' : state.error,
    })
  },

  applyCheckInState(state: Readonly<CheckInState>): void {
    const status = state.status
    this.setData({
      checkInStatus: status,
      checkInDays: status ? toCheckInDays(status) : [],
      nextMilestone: status ? getNextMilestone(status) : null,
      isCheckInLoading: !status && (state.isLoading || !state.error),
      isCheckingIn: state.isCheckingIn,
      checkInError: status ? '' : state.error,
    })
  },

  async loadUserProfile(): Promise<void> {
    try {
      await userProfileStore.init()
    } catch {
      // Store 已记录错误并通知页面。
    }
  },

  retryProfile() {
    void userProfileStore.refresh().catch(() => {
      // Store 已记录错误并通知页面。
    })
  },

  handleGetUserInfo(event: GetUserInfoEvent) {
    const userInfo = event.detail.userInfo
    if (!event.detail.errMsg.endsWith(':ok') || !userInfo) {
      wx.showToast({ title: '你取消了微信资料授权', icon: 'none' })
      return
    }

    const params: UpdateUserProfileParams = {}
    const avatar = userInfo.avatarUrl.trim()
    const nickname = userInfo.nickName.trim()
    if (avatar) params.avatar = avatar
    if (nickname) params.nickname = nickname

    if (Object.keys(params).length === 0) {
      wx.showToast({ title: '没有获取到头像和昵称', icon: 'none' })
      return
    }

    void this.saveUserProfile(params, '微信资料已同步')
  },

  async saveUserProfile(
    params: UpdateUserProfileParams,
    successMessage: string,
  ): Promise<void> {
    if (userProfileStore.getSnapshot().isUpdating) return

    try {
      await userProfileStore.update(params)
      wx.showToast({ title: successMessage, icon: 'success' })
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '资料更新失败，请重试',
        icon: 'none',
      })
    }
  },

  async loadCheckInStatus(): Promise<void> {
    try {
      await checkInStore.init()
    } catch {
      // Store 已记录错误并通知页面。
    }
  },

  retryCheckInStatus() {
    void checkInStore.refresh().catch(() => {
      // Store 已记录错误并通知页面。
    })
  },

  handleCycleDayTap(event: CycleDayTapEvent) {
    if (event.currentTarget.dataset.canCheckIn) {
      void this.submitCheckIn()
    }
  },

  async submitCheckIn(): Promise<void> {
    const status = this.data.checkInStatus
    if (
      !status ||
      status.has_checked_in ||
      checkInStore.getSnapshot().isCheckingIn ||
      this.data.isCheckInLoading
    ) {
      return
    }

    try {
      const submission = await checkInStore.submit()
      if (!submission.performed) {
        wx.showToast({ title: '今日已签到', icon: 'none' })
        return
      }

      wx.showToast({
        title: `签到成功，获得${submission.status.today_reward_star_coins}星币`,
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '签到失败，请稍后重试',
        icon: 'none',
      })
    }
  },
})
