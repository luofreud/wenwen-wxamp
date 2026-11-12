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

Page({
  data: {
    reports: [] as ReportListItem[],
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
