// pages/archives/index.ts
interface ArchiveScrollEvent {
  detail: {
    scrollLeft: number
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
    archiveScrollLeft: 0,
    thirdArchiveScrollLeft: 0,
    thirdArchiveVisible: true,
    archives: [
      {
        name: '星源',
        relation: '自己',
        zodiac: '摩羯座',
        symbol: '♑',
        tone: 'blue',
        date: '1999/01/20 10:50',
      },
      {
        name: '洛溪',
        relation: '伴侣',
        zodiac: '金牛座',
        symbol: '♉',
        tone: 'orange',
        date: '1999/01/20 10:50',
      },
    ],
  },

  onLoad() {
    this.initNavigation()
  },

  onShow() {
    if (!this.data.navigationReady) {
      this.initNavigation()
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
        navigationRightPadding: Math.ceil(windowInfo.windowWidth - menuButton.left + 8),
        deleteRevealWidth: windowInfo.windowWidth * 120 / 750,
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },

  dismissHint() {
    this.setData({ showHint: false })
  },

  handleArchiveScroll(event: ArchiveScrollEvent) {
    this.setData({ archiveScrollLeft: event.detail.scrollLeft })
  },

  settleArchiveSwipe() {
    const target = this.data.archiveScrollLeft >= this.data.deleteRevealWidth / 2
      ? this.data.deleteRevealWidth
      : 0
    const resetTarget = target === 0 ? 1 : Math.max(target - 1, 0)
    this.setData({ thirdArchiveScrollLeft: resetTarget }, () => {
      this.setData({ thirdArchiveScrollLeft: target })
    })
  },

  deleteThirdArchive() {
    this.setData({
      thirdArchiveVisible: false,
      thirdArchiveScrollLeft: 0,
      archiveScrollLeft: 0,
    })
  },
})
