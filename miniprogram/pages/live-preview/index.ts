import {
  cancelLiveEventReservation,
  getLiveEvent,
  reserveLiveEvent as reserveLiveEventRequest,
} from '../../services/index'
import type { LiveEvent } from '../../services/index'

type LiveTimeState = 'upcoming' | 'live' | 'ended'

const DEFAULT_LIVE_DURATION_MS = 3 * 60 * 60 * 1000
const liveStateTimerByPage = new WeakMap<object, ReturnType<typeof setInterval>>()

// 预约前申请直播提醒订阅授权；后续可追加第二个提醒模板。
const LIVE_REMINDER_TEMPLATE_IDS = [
  'EdGu2lM-BKrA3-cXAxaH0jJpv6N31yWaJ4lxjqHYCSU',
]

const formatLiveStartAt = (value: string | null | undefined): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value?.trim() ?? '')
  if (!match) return '时间待定'

  const month = Number(match[2])
  const day = Number(match[3])
  return `${match[1]}年${month}月${day}日 ${match[4]}:${match[5]}`
}

const resolveLiveTimeState = (
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  now = Date.now(),
): LiveTimeState => {
  const startTime = Date.parse(startAt ?? '')
  if (!Number.isFinite(startTime)) return 'upcoming'

  const parsedEndTime = Date.parse(endAt ?? '')
  const endTime = Number.isFinite(parsedEndTime) && parsedEndTime >= startTime
    ? parsedEndTime
    : startTime + DEFAULT_LIVE_DURATION_MS

  if (now < startTime) return 'upcoming'
  if (now > endTime) return 'ended'
  return 'live'
}

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

const confirmCancelReservation = (): Promise<boolean> => {
  return new Promise((resolve) => {
    wx.showModal({
      title: '取消预约',
      content: '确定取消这场直播的预约吗？',
      confirmText: '取消预约',
      confirmColor: '#9b51e0',
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
}

Page({
  data: {
    eventNo: '',
    liveEvent: null as LiveEvent | null,
    liveStartAtText: '',
    liveTimeState: 'upcoming' as LiveTimeState,
    isLoading: true,
    isReserving: false,
    isCancelling: false,
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

  onShow() {
    this.refreshLiveTimeState()
    this.startLiveStateTimer()
  },

  onHide() {
    this.stopLiveStateTimer()
  },

  onUnload() {
    this.stopLiveStateTimer()
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
          liveStartAtText: '',
          liveTimeState: 'upcoming',
          loadError: response.msg || '直播详情加载失败',
        })
        return
      }

      this.setData({
        liveEvent: response.data,
        liveStartAtText: formatLiveStartAt(response.data.start_at),
        liveTimeState: resolveLiveTimeState(response.data.start_at, response.data.end_at),
      })
    } catch (error) {
      this.setData({
        liveEvent: null,
        liveStartAtText: '',
        liveTimeState: 'upcoming',
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

  startLiveStateTimer() {
    if (liveStateTimerByPage.has(this)) return

    const timer = setInterval(() => {
      this.refreshLiveTimeState()
    }, 30 * 1000)
    liveStateTimerByPage.set(this, timer)
  },

  stopLiveStateTimer() {
    const timer = liveStateTimerByPage.get(this)
    if (timer === undefined) return
    clearInterval(timer)
    liveStateTimerByPage.delete(this)
  },

  refreshLiveTimeState() {
    const liveEvent = this.data.liveEvent
    if (!liveEvent) return

    const liveTimeState = resolveLiveTimeState(liveEvent.start_at, liveEvent.end_at)
    if (liveTimeState !== this.data.liveTimeState) {
      this.setData({ liveTimeState })
    }
  },

  handlePrimaryAction() {
    if (this.data.liveTimeState === 'live') {
      this.enterLiveRoom()
      return
    }
    if (this.data.liveTimeState === 'ended') return
    if (this.data.liveEvent?.reservation_status === 'reserved') {
      void this.cancelReservation()
      return
    }
    void this.reserveLiveEvent()
  },

  enterLiveRoom() {
    const appId = this.data.liveEvent?.mini_program_app_id?.trim() ?? ''
    const path = this.data.liveEvent?.mini_program_path?.trim() ?? ''
    if (!appId || !path) {
      wx.showToast({ title: '直播小程序暂不可用', icon: 'none' })
      return
    }

    wx.navigateToMiniProgram({
      appId,
      path,
      envVersion: 'release',
      fail: (res) => {
        if (res.errMsg === 'navigateToMiniProgram:fail cancel') return
        wx.showToast({ title: '进入直播间失败', icon: 'none' })
      },
    })
  },

  async reserveLiveEvent(): Promise<void> {
    const liveEvent = this.data.liveEvent
    if (!liveEvent || this.data.isReserving || this.data.isCancelling) return

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

  async cancelReservation(): Promise<void> {
    const liveEvent = this.data.liveEvent
    if (
      !liveEvent
      || liveEvent.reservation_status !== 'reserved'
      || this.data.isReserving
      || this.data.isCancelling
    ) {
      return
    }

    const confirmed = await confirmCancelReservation()
    if (!confirmed) return

    const currentLiveEvent = this.data.liveEvent
    if (!currentLiveEvent || currentLiveEvent.reservation_status !== 'reserved') return

    this.setData({ isCancelling: true })

    try {
      const response = await cancelLiveEventReservation(currentLiveEvent.event_no)
      if (response.code !== 200) {
        throw new Error(response.msg || '取消预约失败')
      }

      this.setData({
        liveEvent: {
          ...currentLiveEvent,
          reservation_status: 'cancelled',
          reservation_count: response.data.cancelled
            ? Math.max(0, currentLiveEvent.reservation_count - 1)
            : currentLiveEvent.reservation_count,
        },
      })
      wx.showToast({ title: '已取消预约', icon: 'success' })
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '取消预约失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      this.setData({ isCancelling: false })
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
