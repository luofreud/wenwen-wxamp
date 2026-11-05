import { createArchive, updateArchive } from '../../services/index'
import type {
  Archive,
  CreateArchiveParams,
  DaylightSaving,
  DictionaryItem,
  Gender,
  UpdateArchiveParams,
} from '../../services/index'
import { archiveStore, dictionaryStore } from '../../stores/index'

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
  id: number
  label: string
  value: number
}

interface ArchiveFormSnapshot {
  name: string
  remark: string
  gender: Gender
  birth_time: string
  birth_place: string
  birth_longitude: number
  birth_latitude: number
  current_place: string
  current_longitude: number
  current_latitude: number
  timezone: number
  daylight_saving: DaylightSaving
}

const NAME_MAX_LENGTH = 20
const REMARK_MAX_LENGTH = 50

const getDateText = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTimezoneIndex = (
  options: TimezoneOption[],
  timezone: number,
): number => {
  const index = options.findIndex(({ value }) => value === timezone)
  return index >= 0 ? index : 0
}

const toTimezoneOptions = (items: DictionaryItem[]): TimezoneOption[] => {
  return items
    .filter(({ status, value }) => status === 1 && Number.isFinite(Number(value)))
    .sort((left, right) => left.sort - right.sort)
    .map((item) => ({
      id: item.id,
      label: item.label,
      value: Number(item.value),
    }))
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
    nameMaxLength: NAME_MAX_LENGTH,
    remarkMaxLength: REMARK_MAX_LENGTH,
    gender: 2 as Gender,
    birthDate: '',
    birthTime: '',
    birthPlaceText: '',
    birthLongitude: null as number | null,
    birthLatitude: null as number | null,
    currentPlaceText: '',
    currentLongitude: null as number | null,
    currentLatitude: null as number | null,
    choosingLocation: '' as 'birth' | 'current' | '',
    timezoneOptions: [] as TimezoneOption[],
    timezoneIndex: 0,
    timezoneValue: null as number | null,
    timezoneLabel: '加载中…',
    isTimezoneLoading: false,
    timezoneError: '',
    daylightSaving: false,
    dateStart: '1900-01-01',
    dateEnd: getDateText(new Date()),
    initialForm: null as ArchiveFormSnapshot | null,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.initNavigation()
    void this.loadTimezoneOptions()

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

  async loadTimezoneOptions(forceRefresh = false): Promise<void> {
    if (this.data.isTimezoneLoading) return

    this.setData({
      isTimezoneLoading: true,
      timezoneError: '',
      timezoneLabel: '加载中…',
    })

    try {
      const items = await dictionaryStore.getItems('timezone', forceRefresh)
      const timezoneOptions = toTimezoneOptions(items)
      if (timezoneOptions.length === 0) {
        throw new Error('暂无可用时区')
      }

      const defaultTimezone = timezoneOptions.find(({ value }) => value === 8)
        ?? timezoneOptions[0]
      const timezoneValue = this.data.timezoneValue ?? defaultTimezone.value
      const timezoneIndex = getTimezoneIndex(timezoneOptions, timezoneValue)
      const selectedOption = timezoneOptions[timezoneIndex]

      this.setData({
        timezoneOptions,
        timezoneIndex,
        timezoneValue: selectedOption.value,
        timezoneLabel: selectedOption.label,
      })
    } catch (error) {
      const timezoneError = error instanceof Error
        ? error.message
        : '获取时区失败，请稍后重试'
      this.setData({
        timezoneError,
        timezoneLabel: '加载失败，点击重试',
      })
    } finally {
      this.setData({ isTimezoneLoading: false })
    }
  },

  async loadArchive(archiveId: number, forceRefresh = false): Promise<void> {
    this.setData({ isLoading: true, loadError: '' })

    try {
      if (forceRefresh) {
        await archiveStore.refresh()
      } else {
        await archiveStore.init()
      }

      const archive = archiveStore.getArchiveById(archiveId)
      if (!archive) {
        this.setData({ loadError: '未找到该档案，可能已被删除' })
        return
      }

      this.fillArchive(archive)
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
    const daylightSaving: DaylightSaving = archive.daylight_saving === 1 ? 1 : 0
    const timezoneIndex = getTimezoneIndex(
      this.data.timezoneOptions,
      archive.timezone,
    )
    const timezoneOption = this.data.timezoneOptions[timezoneIndex]
    const timezoneValue = timezoneOption?.value ?? archive.timezone
    const initialForm: ArchiveFormSnapshot = {
      name: archive.name,
      remark: archive.remark,
      gender: archive.gender,
      birth_time: buildBirthTime(birth.date, birth.time),
      birth_place: archive.birth_place,
      birth_longitude: archive.birth_longitude,
      birth_latitude: archive.birth_latitude,
      current_place: archive.current_place,
      current_longitude: archive.current_longitude,
      current_latitude: archive.current_latitude,
      timezone: archive.timezone,
      daylight_saving: daylightSaving,
    }

    this.setData({
      name: archive.name,
      remark: archive.remark,
      gender: archive.gender,
      birthDate: birth.date,
      birthTime: birth.time,
      birthPlaceText: archive.birth_place,
      birthLongitude: archive.birth_longitude,
      birthLatitude: archive.birth_latitude,
      currentPlaceText: archive.current_place,
      currentLongitude: archive.current_longitude,
      currentLatitude: archive.current_latitude,
      timezoneIndex,
      timezoneValue,
      timezoneLabel: timezoneOption?.label
        ?? (this.data.timezoneError ? '加载失败，点击重试' : '加载中…'),
      daylightSaving: daylightSaving === 1,
      initialForm,
    })
  },

  retryLoad() {
    if (this.data.archiveId !== null) {
      void this.loadArchive(this.data.archiveId, true)
    }
  },

  handleNameInput(event: TextInputEvent) {
    this.setData({ name: event.detail.value.slice(0, NAME_MAX_LENGTH) })
  },

  handleRemarkInput(event: TextInputEvent) {
    this.setData({ remark: event.detail.value.slice(0, REMARK_MAX_LENGTH) })
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

  handleBirthPlaceTap() {
    this.chooseArchiveLocation('birth')
  },

  handleCurrentPlaceTap() {
    this.chooseArchiveLocation('current')
  },

  chooseArchiveLocation(locationType: 'birth' | 'current') {
    if (this.data.choosingLocation) return

    const isBirth = locationType === 'birth'
    const latitude = isBirth
      ? this.data.birthLatitude
      : this.data.currentLatitude
    const longitude = isBirth
      ? this.data.birthLongitude
      : this.data.currentLongitude
    const options: WechatMiniprogram.ChooseLocationOption = {
      success: (result) => {
        const placeText = result.address.trim() || result.name.trim()
        if (!placeText) {
          wx.showToast({ title: '未获取到地点信息，请重新选择', icon: 'none' })
          return
        }

        if (isBirth) {
          this.setData({
            birthPlaceText: placeText,
            birthLongitude: result.longitude,
            birthLatitude: result.latitude,
          })
          return
        }

        this.setData({
          currentPlaceText: placeText,
          currentLongitude: result.longitude,
          currentLatitude: result.latitude,
        })
      },
      fail: (error) => {
        if (error.errMsg.includes('cancel')) return
        wx.showToast({ title: '打开地图失败，请稍后重试', icon: 'none' })
      },
      complete: () => {
        this.setData({ choosingLocation: '' })
      },
    }

    if (latitude !== null && longitude !== null) {
      options.latitude = latitude
      options.longitude = longitude
    }

    this.setData({ choosingLocation: locationType })
    wx.chooseLocation(options)
  },

  handleTimezoneChange(event: PickerChangeEvent) {
    const timezoneIndex = Number(event.detail.value)
    const timezoneOption = this.data.timezoneOptions[timezoneIndex]
    if (!timezoneOption) return

    this.setData({
      timezoneIndex,
      timezoneValue: timezoneOption.value,
      timezoneLabel: timezoneOption.label,
    })
  },

  handleTimezoneTap() {
    if (this.data.timezoneError && !this.data.isTimezoneLoading) {
      void this.loadTimezoneOptions(true)
    }
  },

  handleDaylightSavingChange(event: SwitchChangeEvent) {
    this.setData({ daylightSaving: event.detail.value })
  },

  getFormSnapshot(): ArchiveFormSnapshot | null {
    const name = this.data.name.trim()
    const birthPlace = this.data.birthPlaceText.trim()
    const birthLongitude = this.data.birthLongitude
    const birthLatitude = this.data.birthLatitude
    const currentPlace = this.data.currentPlaceText.trim()
    const currentLongitude = this.data.currentLongitude
    const currentLatitude = this.data.currentLatitude

    if (!name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' })
      return null
    }
    if (name.length > NAME_MAX_LENGTH) {
      wx.showToast({ title: `姓名不超过${NAME_MAX_LENGTH}字`, icon: 'none' })
      return null
    }
    if (this.data.gender !== 1 && this.data.gender !== 2) {
      wx.showToast({ title: '请选择性别', icon: 'none' })
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
    if (birthLongitude === null || birthLatitude === null) {
      wx.showToast({ title: '请在地图中选择出生地点', icon: 'none' })
      return null
    }
    if (
      !Number.isFinite(birthLongitude)
      || birthLongitude < -180
      || birthLongitude > 180
      || !Number.isFinite(birthLatitude)
      || birthLatitude < -90
      || birthLatitude > 90
    ) {
      wx.showToast({ title: '出生地点坐标无效', icon: 'none' })
      return null
    }
    if (!currentPlace) {
      wx.showToast({ title: '请选择现居地', icon: 'none' })
      return null
    }
    if (currentLongitude === null || currentLatitude === null) {
      wx.showToast({ title: '请在地图中选择现居地', icon: 'none' })
      return null
    }
    if (
      !Number.isFinite(currentLongitude)
      || currentLongitude < -180
      || currentLongitude > 180
      || !Number.isFinite(currentLatitude)
      || currentLatitude < -90
      || currentLatitude > 90
    ) {
      wx.showToast({ title: '现居地坐标无效', icon: 'none' })
      return null
    }

    const remark = this.data.remark.trim()
    if (remark.length > REMARK_MAX_LENGTH) {
      wx.showToast({ title: `备注不超过${REMARK_MAX_LENGTH}字`, icon: 'none' })
      return null
    }

    const timezone = this.data.timezoneValue
    if (timezone === null) {
      wx.showToast({ title: '请选择时区', icon: 'none' })
      return null
    }

    return {
      name,
      remark,
      gender: this.data.gender,
      birth_time: buildBirthTime(this.data.birthDate, this.data.birthTime),
      birth_place: birthPlace,
      birth_longitude: birthLongitude,
      birth_latitude: birthLatitude,
      current_place: currentPlace,
      current_longitude: currentLongitude,
      current_latitude: currentLatitude,
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
      'birth_longitude',
      'birth_latitude',
      'current_place',
      'current_longitude',
      'current_latitude',
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
        archiveStore.upsertArchive(response.data)
      } else {
        const params = this.getUpdateParams(form)
        if (Object.keys(params).length === 0) {
          wx.navigateBack()
          return
        }

        const response = await updateArchive(archiveId, params)
        if (response.code !== 200) return
        archiveStore.upsertArchive(response.data)
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
