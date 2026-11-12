import { chinaCityData } from '../../utils/china-city'
import type { CityNodeData } from '../../utils/china-city'

type LocationNode = CityNodeData

interface CascadeState {
  columns: LocationNode[][]
  indexes: number[]
  selection: LocationNode[]
}

interface PickerChangeEvent {
  detail: {
    value: number[]
  }
}

interface LocationSelectionDetail {
  value: number
  ids: number[]
  names: string[]
  path: string
  province: LocationNode
  city: LocationNode
  district: LocationNode
  longitude: number | null
  latitude: number | null
  timezone: number | null
}

interface LocationInput {
  value?: number
  text?: string
  longitude?: number | null
  latitude?: number | null
  timezone?: number | null
}

const LOCATION_DATA = chinaCityData
const DEFAULT_INDEXES = [0, 0, 0]

const normalizeIndex = (value: number, length: number): number => {
  if (length <= 0 || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(Math.trunc(value), length - 1))
}

const getChildren = (node: LocationNode | undefined): LocationNode[] => {
  return node?.sub ?? []
}

const resolveCascade = (sourceIndexes: number[]): CascadeState => {
  const provinceIndex = normalizeIndex(sourceIndexes[0] ?? 0, LOCATION_DATA.length)
  const province = LOCATION_DATA[provinceIndex]
  const cities = getChildren(province)
  const cityIndex = normalizeIndex(sourceIndexes[1] ?? 0, cities.length)
  const city = cities[cityIndex]
  const districts = getChildren(city)
  const districtIndex = normalizeIndex(sourceIndexes[2] ?? 0, districts.length)
  const district = districts[districtIndex]

  return {
    columns: [LOCATION_DATA, cities, districts],
    indexes: [provinceIndex, cityIndex, districtIndex],
    selection: [province, city, district].filter((item): item is LocationNode => Boolean(item)),
  }
}

const findIndexesByDistrictId = (districtId: number): number[] | null => {
  for (let provinceIndex = 0; provinceIndex < LOCATION_DATA.length; provinceIndex += 1) {
    const cities = getChildren(LOCATION_DATA[provinceIndex])
    for (let cityIndex = 0; cityIndex < cities.length; cityIndex += 1) {
      const districts = getChildren(cities[cityIndex])
      const districtIndex = districts.findIndex(({ id }) => id === districtId)
      if (districtIndex >= 0) {
        return [provinceIndex, cityIndex, districtIndex]
      }
    }
  }

  return null
}

const findNearestIndexes = (longitude: number, latitude: number): number[] | null => {
  let nearestIndexes: number[] | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  const longitudeScale = Math.cos(latitude * Math.PI / 180)

  LOCATION_DATA.forEach((province, provinceIndex) => {
    getChildren(province).forEach((city, cityIndex) => {
      getChildren(city).forEach((district, districtIndex) => {
        const districtLongitude = toNumberOrNull(district.longitude)
        const districtLatitude = toNumberOrNull(district.latitude)
        if (districtLongitude === null || districtLatitude === null) return

        const rawLongitudeDelta = Math.abs(districtLongitude - longitude)
        const longitudeDelta = Math.min(rawLongitudeDelta, 360 - rawLongitudeDelta)
          * longitudeScale
        const latitudeDelta = districtLatitude - latitude
        const distance = longitudeDelta ** 2 + latitudeDelta ** 2
        if (distance >= nearestDistance) return

        nearestDistance = distance
        nearestIndexes = [provinceIndex, cityIndex, districtIndex]
      })
    })
  })

  return nearestIndexes
}

const toPickerRange = (columns: LocationNode[][]): string[][] => {
  return columns.map((column) => column.map(({ name }) => name))
}

const toNumberOrNull = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const readLocationInput = (value: unknown): LocationInput | null => {
  if (typeof value !== 'object' || value === null) return null
  return value as LocationInput
}

const readCoordinate = (
  value: number | null | undefined,
  minimum: number,
  maximum: number,
): number | null => {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum
    ? value
    : null
}

const findIndexesByLocation = (
  districtId: number,
  location: LocationInput | null,
): number[] | null => {
  const longitude = readCoordinate(location?.longitude, -180, 180)
  const latitude = readCoordinate(location?.latitude, -90, 90)
  const coordinateIndexes = longitude !== null && latitude !== null
    ? findNearestIndexes(longitude, latitude)
    : null

  return districtId > 0
    ? findIndexesByDistrictId(districtId) ?? coordinateIndexes
    : coordinateIndexes
}

const buildSelectionDetail = (selection: LocationNode[]): LocationSelectionDetail | null => {
  const [province, city, district] = selection
  if (!province || !city || !district) return null

  const names = selection.map(({ name }) => name)
  return {
    value: district.id,
    ids: selection.map(({ id }) => id),
    names,
    path: names.join(' / '),
    province,
    city,
    district,
    longitude: toNumberOrNull(district.longitude),
    latitude: toNumberOrNull(district.latitude),
    timezone: toNumberOrNull(district.tz),
  }
}

const buildLocationDetail = (location: LocationInput | null): LocationSelectionDetail | null => {
  if (!location) return null

  const indexes = findIndexesByLocation(Number(location.value), location)
  if (!indexes) return null

  const detail = buildSelectionDetail(resolveCascade(indexes).selection)
  if (!detail) return null

  return {
    ...detail,
    path: location.text?.trim() || detail.path,
    longitude: readCoordinate(location.longitude, -180, 180) ?? detail.longitude,
    latitude: readCoordinate(location.latitude, -90, 90) ?? detail.latitude,
    timezone: typeof location.timezone === 'number' && Number.isFinite(location.timezone)
      ? location.timezone
      : detail.timezone,
  }
}

Component({
  externalClasses: ['custom-class'],

  properties: {
    label: {
      type: String,
      value: '地区',
    },
    placeholder: {
      type: String,
      value: '请选择地区',
      observer: 'syncPlaceholder',
    },
    value: {
      type: Number,
      value: 0,
      observer: 'syncSelection',
    },
    location: {
      type: Object,
      value: null,
      observer: 'syncSelection',
    },
    sameLocation: {
      type: Object,
      value: null,
      observer: 'syncSameLocation',
    },
    sameLocationLabel: {
      type: String,
      value: '同出生地点',
    },
    variant: {
      type: String,
      value: 'card',
    },
    required: {
      type: Boolean,
      value: false,
    },
    disabled: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    visible: false,
    canUseSameLocation: false,
    displayText: '请选择地区',
    hasValue: false,
    pickerRange: [[], [], []] as string[][],
    pickerValue: [...DEFAULT_INDEXES],
  },

  lifetimes: {
    attached() {
      this.syncSelection()
    },
  },

  methods: {
    syncSelection() {
      const districtId = Number(this.data.value)
      const location = readLocationInput(this.data.location)
      const matchedIndexes = findIndexesByLocation(districtId, location)
      const state = resolveCascade(matchedIndexes ?? DEFAULT_INDEXES)
      const detail = matchedIndexes
        ? buildSelectionDetail(state.selection)
        : null
      const locationText = location?.text?.trim() ?? ''

      this.setData({
        displayText: locationText || detail?.path || this.data.placeholder,
        hasValue: Boolean(locationText || detail),
        pickerRange: toPickerRange(state.columns),
        pickerValue: state.indexes,
      })
    },

    syncSameLocation(value: unknown) {
      const detail = buildLocationDetail(readLocationInput(value))
      this.setData({ canUseSameLocation: detail !== null })
    },

    syncPlaceholder(placeholder: string) {
      if (this.data.hasValue) return
      this.setData({ displayText: placeholder })
    },

    openPicker() {
      if (this.data.disabled) return
      this.syncSelection()
      this.setData({ visible: true })
    },

    handlePickerChange(event: PickerChangeEvent) {
      const currentIndexes = this.data.pickerValue
      const nextIndexes = event.detail.value.map(Number)
      if (nextIndexes[0] !== currentIndexes[0]) {
        nextIndexes[1] = 0
        nextIndexes[2] = 0
      } else if (nextIndexes[1] !== currentIndexes[1]) {
        nextIndexes[2] = 0
      }

      const state = resolveCascade(nextIndexes)
      this.setData({
        pickerRange: toPickerRange(state.columns),
        pickerValue: state.indexes,
      })
    },

    handleConfirm() {
      const state = resolveCascade(this.data.pickerValue)
      const detail = buildSelectionDetail(state.selection)
      if (!detail) return

      this.setData({
        displayText: detail.path,
        hasValue: true,
        pickerRange: toPickerRange(state.columns),
        pickerValue: state.indexes,
        visible: false,
      })
      this.triggerEvent('change', detail)
    },

    handleSameLocation() {
      const detail = buildLocationDetail(readLocationInput(this.data.sameLocation))
      if (!detail) return

      const indexes = findIndexesByDistrictId(detail.value)
        ?? findIndexesByLocation(0, detail)
        ?? DEFAULT_INDEXES
      const state = resolveCascade(indexes)
      this.setData({
        displayText: detail.path,
        hasValue: true,
        pickerRange: toPickerRange(state.columns),
        pickerValue: state.indexes,
        visible: false,
      })
      this.triggerEvent('change', detail)
    },

    handleCancel() {
      this.syncSelection()
      this.setData({ visible: false })
      this.triggerEvent('cancel')
    },

    preventTouchMove() {},

    preventBubble() {},

    clearSelection() {
      const state = resolveCascade(DEFAULT_INDEXES)
      this.setData({
        displayText: this.data.placeholder,
        hasValue: false,
        pickerRange: toPickerRange(state.columns),
        pickerValue: state.indexes,
        visible: false,
      })
      this.triggerEvent('clear')
    },
  },
})
