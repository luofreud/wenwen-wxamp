// pages/index/index.ts
import { getAssessmentTypes, getLiveEvents } from '../../services/index'
import type { AssessmentType, LiveEvent } from '../../services/index'

interface HomeLiveEvent extends LiveEvent {
  detailUrl: string
}

interface FeaturedAssessment extends AssessmentType {
  image: string
}

interface MoreAssessment extends AssessmentType {
  tone: 'violet' | 'blue' | 'rose'
}

const FEATURED_REPORT_IMAGES = [
  '/assets/images/report-01.png',
  '/assets/images/report-02.png',
  '/assets/images/report-03.png',
]

const MORE_REPORT_TONES: MoreAssessment['tone'][] = [
  'violet',
  'blue',
  'rose',
]

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    liveEvent: null as HomeLiveEvent | null,
    moodBars: [
      { label: '爱情', score: 80, tone: 'love' },
      { label: '健康', score: 90, tone: 'health' },
      { label: '财富', score: 70, tone: 'wealth' },
    ],
    luckItems: [
      { icon: '🌷', value: '紫色郁金香', label: '幸运花', tone: 'flower' },
      { icon: '◆', value: '蓝宝石', label: '幸运石', tone: 'gem' },
      { icon: '', value: '藏红色', label: '幸运色', tone: 'color' },
      { icon: '6', value: '数字 6', label: '幸运数', tone: 'number' },
    ],
    reports: [] as FeaturedAssessment[],
    moreReports: [] as MoreAssessment[],
  },

  onLoad() {
    this.initNavigation()
  },

  onShow() {
    if (!this.data.navigationReady) {
      this.initNavigation()
    }
    void this.loadLiveEvent()
    void this.loadAssessmentTypes()
  },

  async loadAssessmentTypes(): Promise<void> {
    try {
      const response = await getAssessmentTypes()
      if (response.code !== 200) {
        this.setData({ reports: [], moreReports: [] })
        return
      }

      const assessmentTypes = response.data.slice(0, 20)
      const reports = assessmentTypes.slice(0, 3).map((assessment, index) => ({
        ...assessment,
        image: FEATURED_REPORT_IMAGES[index],
      }))
      const moreReports = assessmentTypes.slice(3).map((assessment, index) => ({
        ...assessment,
        tone: MORE_REPORT_TONES[index % MORE_REPORT_TONES.length],
      }))

      this.setData({ reports, moreReports })
    } catch {
      this.setData({ reports: [], moreReports: [] })
    }
  },

  async loadLiveEvent(): Promise<void> {
    try {
      const response = await getLiveEvents({
        page: 1,
        page_size: 1,
      })

      if (response.code !== 200 || response.data.items.length === 0) {
        this.setData({ liveEvent: null })
        return
      }

      const liveEvent = response.data.items[0]
      this.setData({
        liveEvent: {
          ...liveEvent,
          detailUrl: `/pages/live-preview/index?id=${encodeURIComponent(liveEvent.event_no)}`,
        },
      })
    } catch {
      this.setData({ liveEvent: null })
    }
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
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },
})
