// pages/archives/edit.ts
interface TextInputEvent {
  detail: {
    value: string
  }
}

interface PickerChangeEvent {
  detail: {
    value: string
  }
}

interface RegionChangeEvent {
  detail: {
    value: string[]
  }
}

interface SwitchChangeEvent {
  detail: {
    value: boolean
  }
}

interface GenderTapEvent {
  currentTarget: {
    dataset: {
      gender?: string
    }
  }
}

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    name: '',
    relationOptions: ['自己', '伴侣', '家人', '朋友'],
    relationIndex: 0,
    relationLabel: '',
    gender: 'female',
    birthDate: '',
    birthTime: '',
    birthPlace: [] as string[],
    birthPlaceText: '',
    currentPlace: [] as string[],
    currentPlaceText: '',
    timezoneOptions: ['中国北京时间', '日本标准时间', '欧洲中部时间', '美国东部时间'],
    timezoneIndex: 0,
    daylightSaving: false,
    dateStart: '1900-01-01',
    dateEnd: '2026-11-01',
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

  handleNameInput(event: TextInputEvent) {
    this.setData({ name: event.detail.value })
  },

  handleRelationChange(event: PickerChangeEvent) {
    const relationIndex = Number(event.detail.value)
    this.setData({
      relationIndex,
      relationLabel: this.data.relationOptions[relationIndex] || '',
    })
  },

  selectGender(event: GenderTapEvent) {
    const gender = event.currentTarget.dataset.gender
    if (gender !== 'female' && gender !== 'male') return
    this.setData({ gender })
  },

  handleBirthDateChange(event: PickerChangeEvent) {
    this.setData({ birthDate: event.detail.value })
  },

  handleBirthTimeChange(event: PickerChangeEvent) {
    this.setData({ birthTime: event.detail.value })
  },

  handleBirthPlaceChange(event: RegionChangeEvent) {
    this.setData({
      birthPlace: event.detail.value,
      birthPlaceText: event.detail.value.join(' '),
    })
  },

  handleCurrentPlaceChange(event: RegionChangeEvent) {
    this.setData({
      currentPlace: event.detail.value,
      currentPlaceText: event.detail.value.join(' '),
    })
  },

  handleTimezoneChange(event: PickerChangeEvent) {
    this.setData({ timezoneIndex: Number(event.detail.value) })
  },

  handleDaylightSavingChange(event: SwitchChangeEvent) {
    this.setData({ daylightSaving: event.detail.value })
  },

  submitArchive() {
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请填写姓名',
        icon: 'none',
      })
      return
    }

    wx.navigateBack()
  },
})
