// pages/live-preview/index.ts
Page({
  data: {
    noticeNodes: [
      {
        name: 'span',
        attrs: {
          style: 'color:#4A90E2;',
        },
        children: [
          {
            type: 'text',
            text: '预约直播后，在直播开启前5分钟将会通过服务通知提醒您。',
          },
        ],
      },
      {
        name: 'span',
        attrs: {
          style: 'color:#666666;',
        },
        children: [
          {
            type: 'text',
            text: '预约审核通过后即可观看，敬请关注。',
          },
        ],
      },
    ],
  },

  onShareAppMessage() {
    return {
      title: '这是一个直播名称',
      path: '/pages/live-preview/index',
    }
  },
})
