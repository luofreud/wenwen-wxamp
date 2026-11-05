Page({
  data: {
    url: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const encodedUrl = options.url ?? ''
    let url = ''

    try {
      url = decodeURIComponent(encodedUrl).trim()
    } catch {
      url = ''
    }

    if (!/^https:\/\//i.test(url)) {
      wx.showToast({ title: '直播链接无效', icon: 'none' })
      wx.navigateBack()
      return
    }

    this.setData({ url })
  },
})
