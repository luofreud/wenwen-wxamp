import {
  getLiveEvent,
  reserveLiveEvent as reserveLiveEventRequest,
} from '../../services/index'
import type { LiveEvent } from '../../services/index'

// 预约前申请直播提醒订阅授权；后续可追加第二个提醒模板。
const LIVE_REMINDER_TEMPLATE_IDS = [
  'EdGu2lM-BKrA3-cXAxaH0jJpv6N31yWaJ4lxjqHYCSU',
]

// 当前模板同意一次对应开播前两次提醒，因此同意时向服务端声明 2 次。
const getAcceptedSubscriptionCount = (): Promise<0 | 2> => {
  const templateIds = LIVE_REMINDER_TEMPLATE_IDS.slice(0, 2)
  if (templateIds.length === 0) {
    return Promise.resolve(0)
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: templateIds,
      success: (result) => {
        const hasAccepted = templateIds.some((templateId) => {
          return result[templateId] === 'accept'
        })

        resolve(hasAccepted ? 2 : 0)
      },
      fail: () => resolve(0),
    })
  })
}

Page({
  data: {
    eventNo: '',
    liveEvent: null as LiveEvent | null,
    isLoading: true,
    isReserving: false,
    loadError: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const eventNo = options.id?.trim() ?? ''
    if (!eventNo) {
      this.setData({
        isLoading: false,
        loadError: '缺少直播编号，无法加载直播详情。',
      })
      return
    }

    this.setData({ eventNo })
    void this.loadLiveEvent()
  },

  onPullDownRefresh() {
    void this.loadLiveEvent().finally(() => wx.stopPullDownRefresh())
  },

  async loadLiveEvent(): Promise<void> {
    const eventNo = this.data.eventNo
    if (!eventNo) return

    this.setData({
      isLoading: true,
      loadError: '',
    })

    try {
      const response = await getLiveEvent(eventNo)
      if (response.code !== 200) {
        this.setData({
          liveEvent: null,
          loadError: response.msg || '直播详情加载失败',
        })
        return
      }

      this.setData({ liveEvent: response.data })
    } catch (error) {
      this.setData({
        liveEvent: null,
        loadError: error instanceof Error
          ? error.message
          : '网络开小差了，请稍后重试。',
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  retryLoad() {
    void this.loadLiveEvent()
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }

    wx.switchTab({ url: '/pages/index/index' })
  },

  async reserveLiveEvent(): Promise<void> {
    const liveEvent = this.data.liveEvent
    if (!liveEvent || this.data.isReserving) return

    if (liveEvent.reservation_status === 'reserved') {
      wx.showToast({ title: '你已经预约过了', icon: 'none' })
      return
    }

    this.setData({ isReserving: true })

    try {
      const subscriptionAcceptCount = await getAcceptedSubscriptionCount()
      const response = await reserveLiveEventRequest(liveEvent.event_no, {
        subscription_accept_count: subscriptionAcceptCount,
      })

      if (response.code !== 200) return

      this.setData({
        liveEvent: {
          ...liveEvent,
          reservation_status: 'reserved',
          reservation_count: liveEvent.reservation_count + 1,
        },
      })
      wx.showToast({ title: '预约成功', icon: 'success' })
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '预约失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      this.setData({ isReserving: false })
    }
  },

  onShareAppMessage() {
    const liveEvent = this.data.liveEvent
    return {
      title: liveEvent?.title ?? '问问星座直播',
      path: liveEvent
        ? `/pages/live-preview/index?id=${encodeURIComponent(liveEvent.event_no)}`
        : '/pages/index/index',
    }
  },
})
