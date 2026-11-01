// pages/index/index.ts
Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
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
    reports: [
      {
        title: '天赋财富运势报告',
        description: '本命特质、天赋与财运，一份报告读懂自己。',
        image: '/assets/images/report-01.png',
      },
      {
        title: '本命500万财富在哪里？',
        description: '拆解你的财富地图，找到更适合自己的方向。',
        image: '/assets/images/report-02.png',
      },
      {
        title: '未来伴侣具体什么样？',
        description: '从星盘线索，看见亲密关系中的理想模样。',
        image: '/assets/images/report-03.png',
      },
    ],
    moreReports: [
      {
        title: '未来一年机会在哪里？',
        description: '梳理未来一年的重要节点，把握属于你的成长机会。',
        tone: 'violet',
      },
      {
        title: '隐藏的天赋怎么激发？',
        description: '找到被忽略的闪光点，让潜力成为真实的能力。',
        tone: 'blue',
      },
      {
        title: '去哪里发展更适合我？',
        description: '从性格与环境偏好出发，探索更舒服的发展方向。',
        tone: 'rose',
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
      })
    } catch (error) {
      console.warn('获取导航栏尺寸失败', error)
    }
  },
})
