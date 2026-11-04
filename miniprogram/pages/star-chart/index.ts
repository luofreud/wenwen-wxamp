// pages/star-chart/index.ts
import { requestXingpango } from '../../services/index'
import type { Archive } from '../../services/index'
import { archiveStore } from '../../stores/index'
import type { ArchiveState } from '../../stores/index'

interface InterpretationItem {
  symbol: string
  tone: 'sun' | 'moon' | 'ascendant'
  title: string
  subtitle: string
  summary: string
}

interface AnalysisRuntime {
  archiveKey: string
  requestId: number
  storeInitialized: boolean
  unsubscribe: (() => void) | null
}

interface AstrologicalChartComponent {
  exportChartImage(): Promise<string>
}

const NATAL_ANALYSIS_PATH = '/house9calculate' as const
const analysisRuntimeByPage = new WeakMap<object, AnalysisRuntime>()

const PLANET_SYMBOLS: Record<string, string> = {
  '太阳': '☉',
  '月亮': '☽',
  '水星': '☿',
  '金星': '♀',
  '火星': '♂',
  '木星': '♃',
  '土星': '♄',
  '天王星': '♅',
  '海王星': '♆',
  '冥王星': '♇',
  '上升': 'Asc',
}

function createAnalysisRuntime(): AnalysisRuntime {
  return {
    archiveKey: '',
    requestId: 0,
    storeInitialized: false,
    unsubscribe: null,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return {}
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function archiveAnalysisKey(archive: Archive): string {
  return [
    archive.id,
    archive.birth_time,
    archive.birth_latitude,
    archive.birth_longitude,
    archive.timezone,
    archive.updated_at,
  ].join('|')
}

function parseBirthTime(value: string): RegExpExecArray {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim())
  if (!match) throw new Error('当前档案的出生时间格式无效')
  return match
}

function formatTimezone(value: number): string {
  return Number.isInteger(value) ? String(Math.trunc(value)) : String(value)
}

function interpretationTone(planet: string, index: number): InterpretationItem['tone'] {
  if (planet === '太阳') return 'sun'
  if (planet === '月亮') return 'moon'
  if (planet === '上升') return 'ascendant'
  return (['sun', 'moon', 'ascendant'] as const)[index % 3]
}

function parseInterpretations(value: unknown): InterpretationItem[] {
  const responseData = asRecord(value)
  const data = 'interpretations' in responseData
    ? responseData
    : asRecord(responseData.data)
  const interpretations = asRecord(data.interpretations)
  const planetItems = interpretations.planet_positions_interpretation
  if (!Array.isArray(planetItems)) return []

  return planetItems.map((item, index) => {
    const record = asRecord(item)
    const planet = text(record.planet)
    const zodiacValue = text(record.zodiac)
    const zodiac = zodiacValue.endsWith('座') ? zodiacValue.slice(0, -1) : zodiacValue
    return {
      symbol: PLANET_SYMBOLS[planet] ?? '✦',
      tone: interpretationTone(planet, index),
      title: `${planet}${zodiac}`.trim(),
      subtitle: text(record.interpretation_key),
      summary: text(record.content),
    }
  })
}

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    titleBarRight: 0,
    pageHeight: 0,
    isSharingChart: false,
    archiveName: '星盘详情',
    interpretations: [] as InterpretationItem[],
  },

  onLoad() {
    analysisRuntimeByPage.set(this, createAnalysisRuntime())
    this.initNavigation()
    this.bindArchiveStore()
  },

  onShow() {
    if (!this.data.navigationReady) {
      this.initNavigation()
    }
    const runtime = analysisRuntimeByPage.get(this)
    if (runtime?.storeInitialized) {
      this.syncNatalAnalysis(archiveStore.getSnapshot())
    }
  },

  onResize() {
    this.initNavigation()
  },

  onUnload() {
    const runtime = analysisRuntimeByPage.get(this)
    runtime?.unsubscribe?.()
    if (runtime) runtime.requestId += 1
    analysisRuntimeByPage.delete(this)
  },

  bindArchiveStore() {
    const runtime = analysisRuntimeByPage.get(this)
    if (!runtime) return

    runtime.unsubscribe = archiveStore.subscribe((snapshot) => {
      if (runtime.storeInitialized) {
        this.syncNatalAnalysis(snapshot)
      }
    })

    void archiveStore.init()
      .then(() => {
        const currentRuntime = analysisRuntimeByPage.get(this)
        if (!currentRuntime) return
        currentRuntime.storeInitialized = true
        this.syncNatalAnalysis(archiveStore.getSnapshot())
      })
      .catch(() => {
        if (!analysisRuntimeByPage.has(this)) return
        this.setData({ archiveName: '星盘详情', interpretations: [] })
      })
  },

  syncNatalAnalysis(snapshot: Readonly<ArchiveState>) {
    const runtime = analysisRuntimeByPage.get(this)
    if (!runtime) return
    if (snapshot.isLoading) return

    const archive = archiveStore.selectedArchive
    if (!archive) {
      runtime.archiveKey = ''
      runtime.requestId += 1
      this.setData({ archiveName: '星盘详情', interpretations: [] })
      return
    }

    this.setData({ archiveName: archive.name })
    const nextArchiveKey = archiveAnalysisKey(archive)
    if (runtime.archiveKey === nextArchiveKey) return
    runtime.archiveKey = nextArchiveKey
    void this.loadNatalAnalysis(archive)
  },

  async loadNatalAnalysis(archive: Archive): Promise<void> {
    const runtime = analysisRuntimeByPage.get(this)
    if (!runtime) return

    const requestId = runtime.requestId + 1
    runtime.requestId = requestId
    this.setData({ interpretations: [] })

    const latitude = archive.birth_latitude
    const longitude = archive.birth_longitude
    if (latitude === null || longitude === null) return

    try {
      const birthday = parseBirthTime(archive.birth_time)
      const response = await requestXingpango<unknown>({
        path: NATAL_ANALYSIS_PATH,
        year: birthday[1],
        month: birthday[2],
        day: birthday[3],
        hour: birthday[4],
        minute: birthday[5],
        second: birthday[6] ?? '00',
        latitude: latitude.toFixed(2),
        longitude: longitude.toFixed(2),
        timezone: formatTimezone(archive.timezone),
      })

      const currentRuntime = analysisRuntimeByPage.get(this)
      if (!currentRuntime || currentRuntime.requestId !== requestId) return
      if (response.code !== 200) {
        throw new Error(response.msg || '本命盘解读加载失败')
      }
      this.setData({ interpretations: parseInterpretations(response.data) })
    } catch {
      const currentRuntime = analysisRuntimeByPage.get(this)
      if (!currentRuntime || currentRuntime.requestId !== requestId) return
      this.setData({ interpretations: [] })
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
        titleBarRight: Math.ceil(windowInfo.windowWidth - menuButton.left + 12),
        pageHeight: Math.ceil(pageHeight),
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },

  async shareChartImage(): Promise<void> {
    if (this.data.isSharingChart) return

    const chart = this.selectComponent('#astrological-chart') as unknown as AstrologicalChartComponent | null
    if (!chart || typeof chart.exportChartImage !== 'function') {
      wx.showToast({ title: '星盘暂时无法分享，请稍后重试', icon: 'none' })
      return
    }

    this.setData({ isSharingChart: true })
    wx.showLoading({ title: '正在生成图片', mask: true })

    try {
      const path = await chart.exportChartImage()
      wx.hideLoading()
      await wx.showShareImageMenu({
        path,
        needShowEntrance: false,
      })
    } catch (error) {
      wx.hideLoading()
      const record = asRecord(error)
      const message = text(record.errMsg ?? record.message)
      if (!message.includes('cancel')) {
        wx.showToast({ title: '星盘图片生成失败，请稍后重试', icon: 'none' })
      }
    } finally {
      this.setData({ isSharingChart: false })
    }
  },

  onShareAppMessage() {
    return {
      title: '来看看我的本命星盘',
      path: '/pages/star-chart/index',
    }
  },
})
