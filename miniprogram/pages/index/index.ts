// pages/index/index.ts
import { getAssessmentTypes, getUpcomingLiveEvents, requestXingpango } from '../../services/index'
import type { Archive, AssessmentType, UpcomingLiveEvent } from '../../services/index'
import { archiveStore } from '../../stores/index'
import type { ArchiveState } from '../../stores/index'
import { DEFAULT_COLOR_HEX, resolveNamedColor } from '../../utils/color'

type FortuneState = 'archive-loading' | 'fortune-loading' | 'empty' | 'ready' | 'error'

interface FortuneScoreItem {
  label: string
  score: number
  scoreText: string
  heightStyle: string
  tone: 'love' | 'health' | 'wealth'
}

interface FortuneLuckItem {
  colorHex?: string
  icon: string
  value: string
  label: string
  tone: 'flower' | 'gem' | 'color' | 'number'
}

interface DailyFortune {
  love: number
  career: number
  wealth: number
  overall: number
  luckyNumber: number | null
  luckyFlower: string
  luckyColor: string
  luckyStone: string
}

interface HomeFortuneRuntime {
  archiveKey: string
  avatarLoopTimer: ReturnType<typeof setInterval> | null
  avatarShiftTimer: ReturnType<typeof setTimeout> | null
  dataLoadId: number
  requestId: number
  storeInitialized: boolean
  unsubscribe: (() => void) | null
}

interface HomeLiveEvent extends UpcomingLiveEvent {
  description: string
  detailUrl: string
  isLive: boolean
}

interface FeaturedAssessment extends AssessmentType {
  image: string
}

const FEATURED_REPORT_IMAGES = [
  '/assets/images/report-01.png',
  '/assets/images/report-02.png',
  '/assets/images/report-03.png',
]

const LIVE_AVATARS = [
  '/assets/images/avatar.png',
  '/assets/images/avatar01.png',
  '/assets/images/avatar02.png',
  '/assets/images/avatar03.png',
]

const FORTUNE_PATH = '/astrology/luck/day' as const
const homeFortuneRuntime = new WeakMap<object, HomeFortuneRuntime>()

function createHomeFortuneRuntime(): HomeFortuneRuntime {
  return {
    archiveKey: '',
    avatarLoopTimer: null,
    avatarShiftTimer: null,
    dataLoadId: 0,
    requestId: 0,
    storeInitialized: false,
    unsubscribe: null,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readText(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function score(value: unknown): number {
  return Math.max(0, Math.min(100, readNumber(value) ?? 0))
}

function parseDailyFortune(value: unknown): DailyFortune {
  const data = asRecord(value)
  if (!data) throw new Error('今日运势数据格式错误')
  const scores = asRecord(data.scores)

  return {
    love: score(scores?.love ?? data.love),
    career: score(scores?.career ?? data.career),
    wealth: score(scores?.wealth ?? data.wealth),
    overall: score(scores?.overall ?? data.average),
    luckyNumber: readNumber(data.lucky_number),
    luckyFlower: readText(data.lucky_flower),
    luckyColor: readText(data.lucky_color),
    luckyStone: readText(data.lucky_stone),
  }
}

function roundScore(value: number): number {
  return Math.round(value)
}

function formatNumber(value: number | null): string {
  if (value === null) return '--'
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function formatArchiveBirthday(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim())
  if (!match) throw new Error('当前档案的出生时间格式无效')
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6] ?? '00'}`
}

function formatDate(value: Date): string {
  const pad = (part: number): string => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function formatLiveStartTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '直播时间待公布'

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute} 开播`
}

function isLiveNow(
  startAt: string,
  endAt: string | undefined,
  now = Date.now(),
): boolean {
  const startTime = Date.parse(startAt)
  const endTime = Date.parse(endAt ?? '')
  return (
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    startTime <= now &&
    now <= endTime
  )
}

function archiveFortuneKey(archive: Archive, date: string): string {
  return [
    archive.id,
    archive.birth_time,
    archive.birth_longitude,
    archive.birth_latitude,
    archive.current_longitude,
    archive.current_latitude,
    archive.timezone,
    archive.updated_at,
    date,
  ].join('|')
}

function fortuneScores(fortune: DailyFortune): FortuneScoreItem[] {
  const loveScore = roundScore(fortune.love)
  const careerScore = roundScore(fortune.career)
  const wealthScore = roundScore(fortune.wealth)

  return [
    { label: '爱情', score: loveScore, scoreText: String(loveScore), heightStyle: `height: ${loveScore}%;`, tone: 'love' },
    { label: '事业', score: careerScore, scoreText: String(careerScore), heightStyle: `height: ${careerScore}%;`, tone: 'health' },
    { label: '财富', score: wealthScore, scoreText: String(wealthScore), heightStyle: `height: ${wealthScore}%;`, tone: 'wealth' },
  ]
}

function fortuneLuckItems(fortune: DailyFortune): FortuneLuckItem[] {
  return [
    { icon: '🌷', value: fortune.luckyFlower || '--', label: '幸运花', tone: 'flower' },
    { icon: '◆', value: fortune.luckyStone || '--', label: '幸运石', tone: 'gem' },
    {
      colorHex: resolveNamedColor(fortune.luckyColor),
      icon: '',
      value: fortune.luckyColor || '--',
      label: '幸运色',
      tone: 'color',
    },
    { icon: formatNumber(fortune.luckyNumber), value: `数字 ${formatNumber(fortune.luckyNumber)}`, label: '幸运数', tone: 'number' },
  ]
}

function placeholderScores(): FortuneScoreItem[] {
  return [
    { label: '爱情', score: 0, scoreText: '--', heightStyle: 'height: 0%;', tone: 'love' },
    { label: '事业', score: 0, scoreText: '--', heightStyle: 'height: 0%;', tone: 'health' },
    { label: '财富', score: 0, scoreText: '--', heightStyle: 'height: 0%;', tone: 'wealth' },
  ]
}

function placeholderLuckItems(): FortuneLuckItem[] {
  return [
    { icon: '🌷', value: '--', label: '幸运花', tone: 'flower' },
    { icon: '◆', value: '--', label: '幸运石', tone: 'gem' },
    { colorHex: DEFAULT_COLOR_HEX, icon: '', value: '--', label: '幸运色', tone: 'color' },
    { icon: '--', value: '数字 --', label: '幸运数', tone: 'number' },
  ]
}

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    pageHeight: 0,
    scrollViewHeight: 0,
    dataReady: false,
    liveEvent: null as HomeLiveEvent | null,
    liveAvatarItems: [...LIVE_AVATARS, LIVE_AVATARS[0]],
    avatarShifting: false,
    fortuneState: 'archive-loading' as FortuneState,
    fortuneUserName: '',
    moodScoreText: '--',
    moodBars: placeholderScores(),
    luckItems: placeholderLuckItems(),
    reports: [] as FeaturedAssessment[],
    moreReports: [] as AssessmentType[],
  },

  onLoad() {
    homeFortuneRuntime.set(this, createHomeFortuneRuntime())
    this.initNavigation()
    this.bindArchiveStore()
  },

  onShow() {
    if (!homeFortuneRuntime.has(this)) {
      homeFortuneRuntime.set(this, createHomeFortuneRuntime())
      this.bindArchiveStore()
    }
    if (!this.data.navigationReady) {
      this.initNavigation()
    }
    this.startLiveAvatarLoop()
    void this.loadHomeData()
  },

  onHide() {
    this.stopLiveAvatarLoop(true)
  },

  onResize() {
    this.initNavigation()
  },

  onUnload() {
    this.stopLiveAvatarLoop(false)
    const runtime = homeFortuneRuntime.get(this)
    runtime?.unsubscribe?.()
    if (runtime) {
      runtime.dataLoadId += 1
      runtime.requestId += 1
    }
    homeFortuneRuntime.delete(this)
  },

  startLiveAvatarLoop() {
    const runtime = homeFortuneRuntime.get(this)
    if (!runtime || runtime.avatarLoopTimer !== null) return

    runtime.avatarLoopTimer = setInterval(() => {
      this.shiftLiveAvatar()
    }, 2400)
  },

  stopLiveAvatarLoop(resetAnimation: boolean) {
    const runtime = homeFortuneRuntime.get(this)
    if (!runtime) return

    if (runtime.avatarLoopTimer !== null) {
      clearInterval(runtime.avatarLoopTimer)
      runtime.avatarLoopTimer = null
    }
    if (runtime.avatarShiftTimer !== null) {
      clearTimeout(runtime.avatarShiftTimer)
      runtime.avatarShiftTimer = null
    }
    if (resetAnimation && this.data.avatarShifting) {
      this.setData({ avatarShifting: false })
    }
  },

  shiftLiveAvatar() {
    const runtime = homeFortuneRuntime.get(this)
    if (!runtime || runtime.avatarShiftTimer !== null || this.data.avatarShifting) return
    if (!this.data.liveEvent || this.data.liveEvent.reservation_count <= LIVE_AVATARS.length) return

    const visibleAvatars = this.data.liveAvatarItems.slice(0, LIVE_AVATARS.length)
    const firstAvatar = visibleAvatars[0]
    if (!firstAvatar || visibleAvatars.length !== LIVE_AVATARS.length) return

    this.setData({ avatarShifting: true })
    runtime.avatarShiftTimer = setTimeout(() => {
      const currentRuntime = homeFortuneRuntime.get(this)
      if (!currentRuntime) return
      currentRuntime.avatarShiftTimer = null

      const nextAvatars = [...visibleAvatars.slice(1), firstAvatar]
      this.setData({
        liveAvatarItems: [...nextAvatars, nextAvatars[0]],
        avatarShifting: false,
      })
    }, 420)
  },

  bindArchiveStore() {
    const runtime = homeFortuneRuntime.get(this)
    if (!runtime) return

    runtime.unsubscribe = archiveStore.subscribe((snapshot) => {
      if (runtime.storeInitialized) {
        void this.syncFortuneFromArchiveState(snapshot)
      }
    })
  },

  async loadHomeData(): Promise<void> {
    const runtime = homeFortuneRuntime.get(this)
    if (!runtime) return

    const dataLoadId = runtime.dataLoadId + 1
    runtime.dataLoadId = dataLoadId
    this.setData({ dataReady: false })

    await Promise.all([
      this.loadArchiveFortune(),
      this.loadLiveEvent(),
      // TODO v2.0 联调后开启
      // this.loadAssessmentTypes(),
    ])

    const currentRuntime = homeFortuneRuntime.get(this)
    if (!currentRuntime || currentRuntime.dataLoadId !== dataLoadId) return
    this.setData({ dataReady: true })
  },

  async loadArchiveFortune(): Promise<void> {
    try {
      await archiveStore.init()
      const runtime = homeFortuneRuntime.get(this)
      if (!runtime) return
      runtime.storeInitialized = true
      await this.syncFortuneFromArchiveState(archiveStore.getSnapshot())
    } catch {
      if (!homeFortuneRuntime.has(this)) return
      this.setFortunePlaceholder('error', '')
    }
  },

  async syncFortuneFromArchiveState(snapshot: Readonly<ArchiveState>): Promise<void> {
    const runtime = homeFortuneRuntime.get(this)
    if (!runtime) return

    if (snapshot.isLoading) {
      if (this.data.fortuneState !== 'ready') {
        this.setFortunePlaceholder('archive-loading', '')
      }
      return
    }

    const archive = archiveStore.selectedArchive
    if (!archive) {
      runtime.archiveKey = ''
      runtime.requestId += 1
      this.setData({
        fortuneState: 'empty',
        fortuneUserName: '',
      })
      return
    }

    const today = formatDate(new Date())
    const nextArchiveKey = archiveFortuneKey(archive, today)
    if (runtime.archiveKey === nextArchiveKey) return
    runtime.archiveKey = nextArchiveKey
    await this.loadDailyFortune(archive, today)
  },

  async loadDailyFortune(archive: Archive, date: string): Promise<void> {
    const runtime = homeFortuneRuntime.get(this)
    if (!runtime) return

    const requestId = runtime.requestId + 1
    runtime.requestId = requestId
    this.setFortunePlaceholder('fortune-loading', archive.name)

    const longitude = archive.current_longitude ?? archive.birth_longitude
    const latitude = archive.current_latitude ?? archive.birth_latitude
    if (longitude === null || latitude === null) {
      this.setFortunePlaceholder('error', archive.name)
      return
    }

    try {
      const response = await requestXingpango<unknown>({
        path: FORTUNE_PATH,
        longitude,
        latitude,
        tz: archive.timezone,
        birthday: formatArchiveBirthday(archive.birth_time),
        date,
      })

      const currentRuntime = homeFortuneRuntime.get(this)
      if (!currentRuntime || currentRuntime.requestId !== requestId) return
      if (response.code !== 200) {
        throw new Error(response.msg || '今日运势加载失败')
      }

      const fortune = parseDailyFortune(response.data)
      this.setData({
        fortuneState: 'ready',
        fortuneUserName: archive.name,
        moodScoreText: String(roundScore(fortune.overall)),
        moodBars: fortuneScores(fortune),
        luckItems: fortuneLuckItems(fortune),
      })
    } catch {
      const currentRuntime = homeFortuneRuntime.get(this)
      if (!currentRuntime || currentRuntime.requestId !== requestId) return
      this.setFortunePlaceholder('error', archive.name)
    }
  },

  setFortunePlaceholder(state: FortuneState, archiveName: string) {
    this.setData({
      fortuneState: state,
      fortuneUserName: archiveName,
      moodScoreText: '--',
      moodBars: placeholderScores(),
      luckItems: placeholderLuckItems(),
    })
  },

  switchToMine() {
    wx.switchTab({
      url: '/pages/mine/index',
    })
  },

  handleFortuneCardTap() {
    if (this.data.fortuneState !== 'error') return
    const archive = archiveStore.selectedArchive
    if (!archive) return
    const date = formatDate(new Date())
    const runtime = homeFortuneRuntime.get(this)
    if (runtime) runtime.archiveKey = archiveFortuneKey(archive, date)
    void this.loadDailyFortune(archive, date)
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
      const moreReports = assessmentTypes.slice(3)

      this.setData({ reports, moreReports })
    } catch {
      this.setData({ reports: [], moreReports: [] })
    }
  },

  async loadLiveEvent(): Promise<void> {
    try {
      const response = await getUpcomingLiveEvents()

      if (
        response.code !== 200
        || !Array.isArray(response.data?.items)
        || response.data.items.length === 0
      ) {
        this.setData({ liveEvent: null })
        return
      }

      const liveEvent = response.data.items[0]
      const reservationCount = Math.max(0, Math.floor(liveEvent.reservation_count || 0))
      const description = liveEvent.description?.trim()
        || liveEvent.display_time_text?.trim()
        || formatLiveStartTime(liveEvent.start_at)
      this.setData({
        liveEvent: {
          ...liveEvent,
          description,
          reservation_count: reservationCount,
          detailUrl: `/pages/live-preview/index?id=${encodeURIComponent(liveEvent.event_no)}`,
          isLive: isLiveNow(liveEvent.start_at, liveEvent.end_at),
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
      const pageHeight = windowInfo.windowHeight

      if (
        windowInfo.windowWidth <= 0 ||
        pageHeight <= 0 ||
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
        pageHeight: Math.ceil(pageHeight),
        scrollViewHeight: Math.max(0, Math.floor(pageHeight - navigationBarHeight)),
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },
})
