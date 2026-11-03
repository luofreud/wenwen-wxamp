import { archiveStore } from './stores/index'

App<IAppOption>({
  globalData: {},

  onLaunch() {
    void archiveStore.init().catch((error: unknown) => {
      console.warn('初始化档案状态失败', error)
    })
  },
})
