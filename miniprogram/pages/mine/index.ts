// pages/mine/index.ts
import {
  getUserProfile,
  updateUserProfile,
} from '../../services/index'
import type {
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
  },

  onLoad() {
    this.initNavigation()
  },

  onShow() {
    if (!this.data.navigationReady) {
      this.initNavigation()
    }
    void this.loadUserProfile()
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
})
