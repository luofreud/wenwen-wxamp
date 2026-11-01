// pages/star-chart/index.ts
Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    titleBarRight: 0,
    interpretations: [
      {
        symbol: '☉',
        tone: 'sun',
        title: '太阳摩羯',
        subtitle: '太阳代表着一个人的本质、自我认知及人生态度。',
        summary: '你重视秩序与目标，习惯把热情藏进行动里。面对漫长旅程，你更相信耐心与积累……',
      },
      {
        symbol: '☽',
        tone: 'moon',
        title: '月亮射手',
        subtitle: '月亮代表着内在情绪、安全感以及本能需求。',
        summary: '你渴望自由宽阔的情绪空间，好奇心与远方总能重新点亮心情，也让你保有坦率的天真……',
      },
      {
        symbol: 'Asc',
        tone: 'ascendant',
        title: '上升水瓶',
        subtitle: '上升代表着面对世界的方式及他人对你的第一印象。',
        summary: '你给人的感觉独立而清醒，乐于从不同角度观察生活，也总能为熟悉的问题带来新答案……',
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
        titleBarRight: Math.ceil(windowInfo.windowWidth - menuButton.left + 12),
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },

  onShareAppMessage() {
    return {
      title: '来看看我的本命星盘',
      path: '/pages/star-chart/index',
    }
  },
})
