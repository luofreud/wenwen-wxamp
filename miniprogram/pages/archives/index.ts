import { deleteArchive } from '../../services/index'
import type { Archive, Gender } from '../../services/index'
import { archiveStore } from '../../stores/index'

interface ArchiveListItem extends Archive {
  birthTimeText: string
  genderLabel: string
  scrollLeft: number
  zodiacName: string
  zodiacSymbol: string
  zodiacTone: 'blue' | 'orange'
}

interface ArchiveScrollEvent {
  currentTarget: {
    dataset: {
      id?: string | number
    }
  }
  detail: {
    scrollLeft: number
  }
}

interface ArchiveActionEvent {
  currentTarget: {
    dataset: {
      id?: string | number
    }
  }
}

interface ZodiacInfo {
  name: string
  symbol: string
  tone: 'blue' | 'orange'
}

const ZODIAC_SIGNS: Array<ZodiacInfo & { end: number }> = [
  { end: 120, name: '摩羯座', symbol: '♑', tone: 'blue' },
  { end: 219, name: '水瓶座', symbol: '♒', tone: 'blue' },
  { end: 320, name: '双鱼座', symbol: '♓', tone: 'blue' },
  { end: 420, name: '白羊座', symbol: '♈', tone: 'orange' },
  { end: 521, name: '金牛座', symbol: '♉', tone: 'orange' },
  { end: 622, name: '双子座', symbol: '♊', tone: 'orange' },
  { end: 723, name: '巨蟹座', symbol: '♋', tone: 'blue' },
  { end: 823, name: '狮子座', symbol: '♌', tone: 'orange' },
  { end: 923, name: '处女座', symbol: '♍', tone: 'orange' },
  { end: 1024, name: '天秤座', symbol: '♎', tone: 'blue' },
  { end: 1123, name: '天蝎座', symbol: '♏', tone: 'blue' },
  { end: 1222, name: '射手座', symbol: '♐', tone: 'orange' },
  { end: 1231, name: '摩羯座', symbol: '♑', tone: 'blue' },
]

const getZodiac = (birthTime: string): ZodiacInfo => {
  const datePart = birthTime.slice(0, 10)
  const month = Number(datePart.slice(5, 7))
  const day = Number(datePart.slice(8, 10))
  const monthDay = month * 100 + day

  return ZODIAC_SIGNS.find(({ end }) => monthDay <= end) ?? ZODIAC_SIGNS[0]
}

const getGenderLabel = (gender: Gender): string => {
  if (gender === 1) return '男生'
  if (gender === 2) return '女生'
  return '未设置'
}

const formatBirthTime = (birthTime: string): string => {
  const normalized = birthTime.replace('T', ' ')
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized
}

const toListItem = (archive: Archive): ArchiveListItem => {
  const zodiac = getZodiac(archive.birth_time)

  return {
    ...archive,
    birthTimeText: formatBirthTime(archive.birth_time),
    genderLabel: getGenderLabel(archive.gender),
    scrollLeft: 0,
    zodiacName: zodiac.name,
    zodiacSymbol: zodiac.symbol,
    zodiacTone: zodiac.tone,
  }
}

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    navigationRightPadding: 0,
    showHint: true,
    deleteRevealWidth: 0,
    isLoading: true,
    loadError: '',
    deletingArchiveId: null as number | null,
    archives: [] as ArchiveListItem[],
  },

  onLoad() {
    this.initNavigation()
  },

  onShow() {
    if (!this.data.navigationReady) {
      this.initNavigation()
    }
    void this.loadArchives()
  },

  onPullDownRefresh() {
    void this.loadArchives(false, true).finally(() => wx.stopPullDownRefresh())
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
        navigationRightPadding: Math.ceil(windowInfo.windowWidth - menuButton.left + 8),
        deleteRevealWidth: windowInfo.windowWidth * 120 / 750,
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },

  async loadArchives(showLoading = true, forceRefresh = false): Promise<void> {
    if (showLoading) {
      this.setData({ isLoading: true })
    }
    this.setData({ loadError: '' })

    try {
      if (forceRefresh) {
        await archiveStore.refresh()
      } else {
        await archiveStore.init()
      }
      this.syncArchivesFromStore()
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络开小差了，请稍后重试'
      this.setData({ loadError: message })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  syncArchivesFromStore() {
    const snapshot = archiveStore.getSnapshot()
    this.setData({
      archives: snapshot.archives.map(toListItem),
    })
  },

  retryLoad() {
    void this.loadArchives()
  },

  dismissHint() {
    this.setData({ showHint: false })
  },

  editArchive(event: ArchiveActionEvent) {
    const archiveId = Number(event.currentTarget.dataset.id)
    if (!Number.isFinite(archiveId)) return

    wx.navigateTo({
      url: `/pages/archives/edit?id=${archiveId}`,
    })
  },

  handleArchiveScroll(event: ArchiveScrollEvent) {
    const archiveId = Number(event.currentTarget.dataset.id)
    if (!Number.isFinite(archiveId)) return

    this.setData({
      archives: this.data.archives.map((archive) => archive.id === archiveId
        ? { ...archive, scrollLeft: event.detail.scrollLeft }
        : archive),
    })
  },

  settleArchiveSwipe(event: ArchiveActionEvent) {
    const archiveId = Number(event.currentTarget.dataset.id)
    if (!Number.isFinite(archiveId)) return

    const archives = this.data.archives.map((archive) => {
      if (archive.id !== archiveId) {
        return { ...archive, scrollLeft: 0 }
      }

      return {
        ...archive,
        scrollLeft: archive.scrollLeft >= this.data.deleteRevealWidth / 2
          ? this.data.deleteRevealWidth
          : 0,
      }
    })
    this.setData({ archives })
  },

  requestDeleteArchive(event: ArchiveActionEvent) {
    const archiveId = Number(event.currentTarget.dataset.id)
    const archive = this.data.archives.find(({ id }) => id === archiveId)
    if (!archive || this.data.deletingArchiveId !== null) return

    wx.showModal({
      title: '删除档案',
      content: `确定删除“${archive.name}”吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: ({ confirm }) => {
        if (confirm) {
          void this.confirmDeleteArchive(archiveId)
        }
      },
    })
  },

  async confirmDeleteArchive(archiveId: number): Promise<void> {
    this.setData({ deletingArchiveId: archiveId })

    try {
      const response = await deleteArchive(archiveId)
      if (response.code !== 200) return

      archiveStore.removeArchive(archiveId)
      this.syncArchivesFromStore()
      wx.showToast({ title: '已删除', icon: 'success' })
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '删除失败，请重试',
        icon: 'none',
      })
    } finally {
      this.setData({ deletingArchiveId: null })
    }
  },
})
