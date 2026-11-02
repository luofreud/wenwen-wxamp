import {
  createArchive,
  getArchive,
  updateArchive,
} from '../../services/index'
import type {
  Archive,
  CreateArchiveParams,
  DaylightSaving,
  Gender,
  UpdateArchiveParams,
} from '../../services/index'

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
      gender?: string | number
    }
  }
}

interface TimezoneOption {
  label: string
  value: number
}

interface ArchiveFormSnapshot {
  name: string
  remark: string
  gender: Gender
  birth_time: string
  birth_place: string
  current_place: string
  timezone: number
  daylight_saving: DaylightSaving
}

const getDateText = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const TIMEZONE_OPTIONS: TimezoneOption[] = Array.from(
  { length: 27 },
  (_, index) => {
    const value = index - 12
    const offset = value >= 0 ? `+${value}` : String(value)
    return {
      label: value === 8 ? 'UTC+8 中国北京时间' : `UTC${offset}`,
      value,
    }
  },
)

const getTimezoneIndex = (timezone: number): number => {
  const index = TIMEZONE_OPTIONS.findIndex(({ value }) => value === timezone)
  return index >= 0 ? index : 20
}

const getBirthParts = (birthTime: string): { date: string; time: string } => {
  const normalized = birthTime.replace('T', ' ')
  return {
    date: normalized.slice(0, 10),
    time: normalized.slice(11, 16),
  }
}

const buildBirthTime = (date: string, time: string): string => {
  return `${date} ${time}:00`
}

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    archiveId: null as number | null,
    pageTitle: '添加档案',
    isLoading: false,
    isSubmitting: false,
    loadError: '',
    name: '',
    remark: '',
    gender: 0 as Gender,
    birthDate: '',
    birthTime: '',
    birthPlace: [] as string[],
    birthPlaceText: '',
    currentPlace: [] as string[],
    currentPlaceText: '',
    timezoneOptions: TIMEZONE_OPTIONS,
    timezoneIndex: 20,
    daylightSaving: false,
    dateStart: '1900-01-01',
    dateEnd: getDateText(new Date()),
    initialForm: null as ArchiveFormSnapshot | null,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.initNavigation()

    const archiveId = Number(options.id)
    if (Number.isFinite(archiveId) && archiveId > 0) {
      this.setData({
        archiveId,
        pageTitle: '编辑档案',
      })
      void this.loadArchive(archiveId)
    }
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

  async loadArchive(archiveId: number): Promise<void> {
    this.setData({ isLoading: true, loadError: '' })

    try {
      const response = await getArchive(archiveId)
      if (response.code !== 200) {
        this.setData({ loadError: response.msg || '档案加载失败' })
        return
      }

      this.fillArchive(response.data)
    } catch (error) {
      this.setData({
        loadError: error instanceof Error ? error.message : '网络开小差了，请稍后重试',
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  fillArchive(archive: Archive) {
    const birth = getBirthParts(archive.birth_time)
    const initialForm: ArchiveFormSnapshot = {
      name: archive.name,
      remark: archive.remark,
      gender: archive.gender,
      birth_time: buildBirthTime(birth.date, birth.time),
      birth_place: archive.birth_place,
      current_place: archive.current_place,
      timezone: archive.timezone,
      daylight_saving: archive.daylight_saving,
    }

    this.setData({
      name: archive.name,
      remark: archive.remark,
      gender: archive.gender,
      birthDate: birth.date,
      birthTime: birth.time,
      birthPlaceText: archive.birth_place,
      currentPlaceText: archive.current_place,
      timezoneIndex: getTimezoneIndex(archive.timezone),
      daylightSaving: archive.daylight_saving === 1,
      initialForm,
    })
  },

  retryLoad() {
    if (this.data.archiveId !== null) {
      void this.loadArchive(this.data.archiveId)
    }
  },

  handleNameInput(event: TextInputEvent) {
    this.setData({ name: event.detail.value })
  },

  handleRemarkInput(event: TextInputEvent) {
    this.setData({ remark: event.detail.value })
  },

  selectGender(event: GenderTapEvent) {
    const gender = Number(event.currentTarget.dataset.gender)
    if (gender !== 0 && gender !== 1 && gender !== 2) return
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

  getFormSnapshot(): ArchiveFormSnapshot | null {
    const name = this.data.name.trim()
    const birthPlace = this.data.birthPlaceText.trim()
    const currentPlace = this.data.currentPlaceText.trim()

    if (!name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' })
      return null
    }
    if (!this.data.birthDate || !this.data.birthTime) {
      wx.showToast({ title: '请选择出生日期和时间', icon: 'none' })
      return null
    }
    if (!birthPlace) {
      wx.showToast({ title: '请选择出生地点', icon: 'none' })
      return null
    }
    if (!currentPlace) {
      wx.showToast({ title: '请选择现居地', icon: 'none' })
      return null
    }

    const timezone = this.data.timezoneOptions[this.data.timezoneIndex]?.value
    if (timezone === undefined) {
      wx.showToast({ title: '请选择时区', icon: 'none' })
      return null
    }

    return {
      name,
      remark: this.data.remark.trim(),
      gender: this.data.gender,
      birth_time: buildBirthTime(this.data.birthDate, this.data.birthTime),
      birth_place: birthPlace,
      current_place: currentPlace,
      timezone,
      daylight_saving: this.data.daylightSaving ? 1 : 0,
    }
  },

  getUpdateParams(form: ArchiveFormSnapshot): UpdateArchiveParams {
    const initialForm = this.data.initialForm
    if (!initialForm) return {}

    const params: UpdateArchiveParams = {}
    const keys: Array<keyof ArchiveFormSnapshot> = [
      'name',
      'remark',
      'gender',
      'birth_time',
      'birth_place',
      'current_place',
      'timezone',
      'daylight_saving',
    ]

    for (const key of keys) {
      if (form[key] !== initialForm[key]) {
        Object.assign(params, { [key]: form[key] })
      }
    }

    return params
  },

  async submitArchive(): Promise<void> {
    if (this.data.isSubmitting || this.data.isLoading) return

    const form = this.getFormSnapshot()
    if (!form) return

    this.setData({ isSubmitting: true })

    try {
      const archiveId = this.data.archiveId
      if (archiveId === null) {
        const params: CreateArchiveParams = {
          ...form,
        }
        const response = await createArchive(params)
        if (response.code !== 200) return
      } else {
        const params = this.getUpdateParams(form)
        if (Object.keys(params).length === 0) {
          wx.navigateBack()
          return
        }

        const response = await updateArchive(archiveId, params)
        if (response.code !== 200) return
      }

      wx.showToast({
        title: archiveId === null ? '档案已创建' : '档案已更新',
        icon: 'success',
      })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '保存失败，请重试',
        icon: 'none',
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },
})
