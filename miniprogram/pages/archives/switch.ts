import type { Archive, Gender } from '../../services/index'
import { archiveStore } from '../../stores/index'

interface ArchiveSwitchItem extends Archive {
  birthTimeText: string
  genderLabel: string
  initial: string
  isSelected: boolean
}

interface ArchiveTapEvent {
  currentTarget: {
    dataset: {
      id?: string | number
    }
  }
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

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    navigationRightPadding: 0,
    isLoading: true,
    loadError: '',
    switchingArchiveId: null as number | null,
    archives: [] as ArchiveSwitchItem[],
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
      this.setData({
        loadError: error instanceof Error ? error.message : '获取档案失败，请稍后重试',
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  syncArchivesFromStore() {
    const snapshot = archiveStore.getSnapshot()
    this.setData({
      archives: snapshot.archives.map((archive) => ({
        ...archive,
        birthTimeText: formatBirthTime(archive.birth_time),
        genderLabel: getGenderLabel(archive.gender),
        initial: archive.name.trim().slice(0, 1) || '星',
        isSelected: archive.id === snapshot.selectedArchiveId,
      })),
    })
  },

  retryLoad() {
    void this.loadArchives()
  },

  selectArchive(event: ArchiveTapEvent) {
    if (this.data.switchingArchiveId !== null) return

    const archiveId = Number(event.currentTarget.dataset.id)
    if (!Number.isFinite(archiveId) || !archiveStore.selectArchive(archiveId)) return

    this.setData({
      switchingArchiveId: archiveId,
      archives: this.data.archives.map((archive) => ({
        ...archive,
        isSelected: archive.id === archiveId,
      })),
    })
    wx.showToast({ title: '已切换档案', icon: 'success', duration: 800 })
    setTimeout(() => {
      wx.navigateBack({ delta: 1 })
    }, 350)
  },
})
