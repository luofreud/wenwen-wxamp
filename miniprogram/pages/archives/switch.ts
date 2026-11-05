import type { Archive, Gender } from '../../services/index'
import { archiveStore } from '../../stores/index'

interface ArchiveSwitchItem extends Archive {
  birthTimeText: string
  genderLabel: string
  isSelected: boolean
  zodiacIcon: string
  zodiacName: string
  zodiacTagClass: string
}

interface ArchiveTapEvent {
  currentTarget: {
    dataset: {
      id?: string | number
    }
  }
}

interface ZodiacInfo {
  icon: string
  name: string
  tagClass: string
}

const ZODIAC_SIGNS: Array<ZodiacInfo & { end: number }> = [
  { end: 120, icon: '/assets/constellation/capricorn.svg', name: '摩羯座', tagClass: 'zodiac-tag--blue' },
  { end: 219, icon: '/assets/constellation/aquarius.svg', name: '水瓶座', tagClass: 'zodiac-tag--blue' },
  { end: 320, icon: '/assets/constellation/pisces.svg', name: '双鱼座', tagClass: 'zodiac-tag--purple' },
  { end: 420, icon: '/assets/constellation/aries.svg', name: '白羊座', tagClass: 'zodiac-tag--red' },
  { end: 521, icon: '/assets/constellation/taurus.svg', name: '金牛座', tagClass: 'zodiac-tag--orange' },
  { end: 622, icon: '/assets/constellation/gemini.svg', name: '双子座', tagClass: 'zodiac-tag--green' },
  { end: 723, icon: '/assets/constellation/cancer.svg', name: '巨蟹座', tagClass: 'zodiac-tag--blue' },
  { end: 823, icon: '/assets/constellation/leo.svg', name: '狮子座', tagClass: 'zodiac-tag--orange' },
  { end: 923, icon: '/assets/constellation/virgo.svg', name: '处女座', tagClass: 'zodiac-tag--green' },
  { end: 1024, icon: '/assets/constellation/libra.svg', name: '天秤座', tagClass: 'zodiac-tag--purple' },
  { end: 1123, icon: '/assets/constellation/scorpio.svg', name: '天蝎座', tagClass: 'zodiac-tag--purple' },
  { end: 1222, icon: '/assets/constellation/sagittarius.svg', name: '射手座', tagClass: 'zodiac-tag--red' },
  { end: 1231, icon: '/assets/constellation/capricorn.svg', name: '摩羯座', tagClass: 'zodiac-tag--blue' },
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
      archives: snapshot.archives.map((archive) => {
        const zodiac = getZodiac(archive.birth_time)

        return {
          ...archive,
          birthTimeText: formatBirthTime(archive.birth_time),
          genderLabel: getGenderLabel(archive.gender),
          isSelected: archive.id === snapshot.selectedArchiveId,
          zodiacIcon: zodiac.icon,
          zodiacName: zodiac.name,
          zodiacTagClass: zodiac.tagClass,
        }
      }),
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
