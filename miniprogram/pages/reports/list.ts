// pages/reports/list.ts
interface ReportListItem {
  id: number
  title: string
  description: string
  cover: string
}

interface ReportTapEvent {
  currentTarget: {
    dataset: {
      id?: number | string
    }
  }
}

const PAGE_SIZE = 12
const MOCK_DELAY = 360
const REPORT_COVERS = [
  '/assets/images/report-01.png',
  '/assets/images/report-02.png',
  '/assets/images/report-03.png',
]

const REPORT_CONTENT: Array<Pick<ReportListItem, 'title' | 'description'>> = [
  { title: '本命星盘深度解读', description: '从行星、宫位与相位中，看见你的天赋、性格与人生主题。' },
  { title: '亲密关系相处指南', description: '理解你在关系中的真实需求，以及更适合你的表达与连接方式。' },
  { title: '年度星象趋势报告', description: '梳理未来一年的重要节奏，提前把握成长、事业与感情机会。' },
  { title: '月亮星座情绪档案', description: '探索你的安全感来源、情绪习惯，以及最有效的自我疗愈方式。' },
  { title: '事业天赋与发展方向', description: '结合星盘优势，发现更能发挥潜力的工作环境与成长路径。' },
  { title: '金星爱情表达报告', description: '读懂你的心动模式、审美偏好和在亲密关系中的价值选择。' },
  { title: '上升星座人格面具', description: '认识别人眼中的你，以及你面对陌生世界时最自然的姿态。' },
  { title: '水星沟通思维报告', description: '解析你的学习方式、沟通节奏与高效表达信息的方法。' },
  { title: '火星行动力使用说明', description: '找到驱动你的核心动力，了解竞争、行动和释放压力的方式。' },
  { title: '十二宫人生领域解析', description: '逐一解读生活中的重要领域，找到能量最集中与最值得经营之处。' },
  { title: '原生家庭与内在根基', description: '从星盘底部探索归属感、家庭互动与内在稳定感的来源。' },
  { title: '社交魅力与人际边界', description: '看清你在人群中的独特吸引力，并建立舒服而清晰的人际边界。' },
  { title: '人生课题成长手册', description: '辨认反复出现的挑战，把压力转化为长期而稳定的成长力量。' },
  { title: '财富潜力与消费倾向', description: '了解你的金钱安全感、资源优势和更适合自己的财富节奏。' },
  { title: '个人能量补给指南', description: '根据星盘元素分布，定制适合你的休息、充电与状态恢复方式。' },
  { title: '友谊模式与圈层偏好', description: '发现你期待怎样的同行者，以及最容易获得支持的社交环境。' },
  { title: '灵感创造力分析', description: '定位你的灵感入口与创作优势，让表达欲拥有更合适的出口。' },
  { title: '长期关系成长地图', description: '看见关系不同阶段的核心议题，让彼此在理解中持续靠近。' },
]

const MOCK_REPORTS: ReportListItem[] = REPORT_CONTENT.map((report, index) => ({
  ...report,
  id: index + 1,
  cover: REPORT_COVERS[index % REPORT_COVERS.length],
}))

const wait = (duration: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, duration)
})

Page({
  data: {
    reports: [] as ReportListItem[],
    currentPage: 1,
    hasMore: true,
    isInitialLoading: true,
    isRefreshing: false,
    isLoadingMore: false,
  },

  onLoad() {
    void this.loadInitialReports()
  },

  onPullDownRefresh() {
    void this.refreshReports()
  },

  onReachBottom() {
    void this.loadMoreReports()
  },

  async loadInitialReports(): Promise<void> {
    this.setData({ isInitialLoading: true })
    await wait(MOCK_DELAY)
    this.setData({
      reports: MOCK_REPORTS.slice(0, PAGE_SIZE),
      currentPage: 1,
      hasMore: PAGE_SIZE < MOCK_REPORTS.length,
      isInitialLoading: false,
    })
  },

  async refreshReports(): Promise<void> {
    if (this.data.isRefreshing) {
      wx.stopPullDownRefresh()
      return
    }

    this.setData({ isRefreshing: true })
    try {
      await wait(MOCK_DELAY)
      this.setData({
        reports: MOCK_REPORTS.slice(0, PAGE_SIZE),
        currentPage: 1,
        hasMore: PAGE_SIZE < MOCK_REPORTS.length,
      })
    } finally {
      this.setData({ isRefreshing: false, isInitialLoading: false })
      wx.stopPullDownRefresh()
    }
  },

  async loadMoreReports(): Promise<void> {
    if (
      this.data.isInitialLoading
      || this.data.isRefreshing
      || this.data.isLoadingMore
      || !this.data.hasMore
    ) {
      return
    }

    const nextPage = this.data.currentPage + 1
    const endIndex = nextPage * PAGE_SIZE

    this.setData({ isLoadingMore: true })
    try {
      await wait(MOCK_DELAY)
      this.setData({
        reports: MOCK_REPORTS.slice(0, endIndex),
        currentPage: nextPage,
        hasMore: endIndex < MOCK_REPORTS.length,
      })
    } finally {
      this.setData({ isLoadingMore: false })
    }
  },

  openReport(event: ReportTapEvent) {
    const reportId = Number(event.currentTarget.dataset.id)
    if (!Number.isFinite(reportId)) return

    wx.showToast({
      title: '报告详情即将开放',
      icon: 'none',
    })
  },
})
