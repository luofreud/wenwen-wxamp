// pages/mine/index.ts
import {
  checkIn,
  getTodayCheckIn,
  getUserProfile,
  updateUserProfile,
} from '../../services/index'
import type {
  CheckInStatus,
  RewardCycleItem,
  RewardMilestone,
  UpdateUserProfileParams,
  UserProfile,
} from '../../services/index'

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

interface CycleDayTapEvent {
  currentTarget: {
    dataset: {
      canCheckIn?: boolean
    }
  }
}

const hasText = (value: string | null): boolean => {
  return Boolean(value?.trim())
}

const getZodiacName = (birthDate: string | null): string => {
  if (!birthDate) return ''

  const month = Number(birthDate.slice(5, 7))
  const day = Number(birthDate.slice(8, 10))
  const monthDay = month * 100 + day

  if (!Number.isFinite(monthDay) || monthDay < 101 || monthDay > 1231) {
    return ''
  }

  const signs = [
    { end: 120, name: '摩羯座' },
    { end: 219, name: '水瓶座' },
    { end: 320, name: '双鱼座' },
    { end: 420, name: '白羊座' },
    { end: 521, name: '金牛座' },
    { end: 622, name: '双子座' },
    { end: 723, name: '巨蟹座' },
    { end: 823, name: '狮子座' },
    { end: 923, name: '处女座' },
    { end: 1024, name: '天秤座' },
    { end: 1123, name: '天蝎座' },
    { end: 1222, name: '射手座' },
    { end: 1231, name: '摩羯座' },
  ]

  return signs.find(({ end }) => monthDay <= end)?.name ?? ''
}

const isSuccessCode = (code: number): boolean => {
  return code === 0 || code === 200
}

const isValidCheckInStatus = (status: CheckInStatus): boolean => {
  return (
    typeof status.has_checked_in === 'boolean' &&
    Number.isFinite(status.current_cycle_day) &&
    Number.isFinite(status.star_coin_balance) &&
    Array.isArray(status.reward_cycle) &&
    status.reward_cycle.length > 0 &&
    Array.isArray(status.reward_milestones)
  )
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
    checkInStatus: null as CheckInStatus | null,
    checkInDays: [] as CheckInDayView[],
    nextMilestone: null as NextMilestoneView | null,
    hasRewardMilestones: false,
    isCheckInLoading: true,
    isCheckingIn: false,
    checkInError: '',
  },

  onLoad() {
    this.initNavigation()
  },

  onShow() {
    if (!this.data.navigationReady) {
      this.initNavigation()
    }
    void this.loadUserProfile()
    void this.loadCheckInStatus()
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

    this.setData({
      profile,
      isProfileEmpty: !hasAvatar && !hasNickname && !hasBirthDate,
      needsWechatInfo: !hasAvatar || !hasNickname,
      profileZodiac: getZodiacName(profile.birth_date),
    })
  },

  async loadUserProfile(): Promise<void> {
    this.setData({
      isProfileLoading: true,
      profileError: '',
    })

    try {
      const response = await getUserProfile()
      if (response.code !== 200) {
        this.setData({ profileError: response.msg || '资料加载失败' })
        return
      }

      this.setProfile(response.data)
    } catch (error) {
      this.setData({
        profileError: error instanceof Error
          ? error.message
          : '网络开小差了，请稍后重试',
      })
    } finally {
      this.setData({ isProfileLoading: false })
    }
  },

  retryProfile() {
    void this.loadUserProfile()
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
    if (this.data.isProfileUpdating) return
    this.setData({ isProfileUpdating: true })

    try {
      const response = await updateUserProfile(params)
      if (response.code !== 200) return

      this.setProfile(response.data)
      wx.showToast({ title: successMessage, icon: 'success' })
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '资料更新失败，请重试',
        icon: 'none',
      })
    } finally {
      this.setData({ isProfileUpdating: false })
    }
  },

  async loadCheckInStatus(showLoading = true): Promise<CheckInStatus | null> {
    if (showLoading) {
      this.setData({ isCheckInLoading: true })
    }
    this.setData({ checkInError: '' })

    try {
      const response = await getTodayCheckIn()
      if (!isSuccessCode(response.code)) {
        this.setData({ checkInError: response.msg || '获取签到信息失败，请稍后重试' })
        return null
      }
      if (!isValidCheckInStatus(response.data)) {
        this.setData({ checkInError: '签到数据格式不正确' })
        return null
      }

      this.setData({
        checkInStatus: response.data,
        checkInDays: toCheckInDays(response.data),
        nextMilestone: getNextMilestone(response.data),
        hasRewardMilestones: response.data.reward_milestones.length > 0,
      })
      return response.data
    } catch (error) {
      this.setData({
        checkInError: error instanceof Error
          ? error.message
          : '获取签到信息失败，请稍后重试',
      })
      return null
    } finally {
      this.setData({ isCheckInLoading: false })
    }
  },

  retryCheckInStatus() {
    void this.loadCheckInStatus()
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
      this.data.isCheckingIn ||
      this.data.isCheckInLoading
    ) {
      return
    }

    this.setData({ isCheckingIn: true })

    try {
      const response = await checkIn()
      if (!isSuccessCode(response.code)) {
        wx.showToast({
          title: response.msg || '签到失败，请稍后重试',
          icon: 'none',
        })
        return
      }

      const refreshedStatus = await this.loadCheckInStatus(false)
      const reward = refreshedStatus?.today_reward_star_coins
        ?? response.data.today_reward_star_coins
      wx.showToast({
        title: `签到成功，获得${reward}星币`,
        icon: 'success',
      })
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '签到失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      this.setData({ isCheckingIn: false })
    }
  },
})
