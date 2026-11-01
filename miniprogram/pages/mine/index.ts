// pages/mine/index.ts
Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    titleBarRight: 0,
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
        titleBarRight: Math.ceil(windowInfo.windowWidth - menuButton.left + 12),
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },
})
