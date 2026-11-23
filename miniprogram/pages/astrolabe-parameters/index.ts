import type { Archive } from '../../services/index'
import type { ZodiacSign } from '../../components/zodiac-avatar/images'
import { exportParametersImage } from '../../utils/astrolabe-parameters-image'
import type { ProfileView, BodyRow, AspectRow } from '../../utils/astrolabe-parameters-image'

type LoadState = 'loading' | 'ready' | 'error'

interface SignPosition {
  deg: number
  min: number
  sec: number
  sign_id: number
  sign_chinese: string
  sign_font: string
}

interface PlanetAspect {
  allow: number
  code_name: string
  current_longitude: number
  deg: number
  min: number
  sec: number
  in_out: string
  planet_chinese: string
  planet_english: string
  planet_font: string
}

interface Planet {
  code_name: string
  longitude: number
  planet_chinese: string
  planet_english?: string
  planet_font: string
  sign: SignPosition
  speed: string
  house_id: number
  planet_allow_degree?: PlanetAspect[]
}

interface ChartPayload {
  planet: Planet[]
  user: {
    planets?: Array<string | number>
    virtual?: Array<string | number>
    planet_xs?: Array<string | number>
    planet_xf?: Array<string | number>
  }
}

interface ParametersTransfer {
  archive: Archive
  payload: ChartPayload
}

interface ZodiacInfo {
  end: number
  sign: ZodiacSign
  name: string
}

const BODY_COLORS = ['#e35d5b', '#f2c94c', '#36a66a', '#327cf2']

const PLANET_SYMBOLS: Record<string, string> = {
  '0': '☉',
  '1': '☽',
  '2': '☿',
  '3': '♀',
  '4': '♂',
  '5': '♃',
  '6': '♄',
  '7': '♅',
  '8': '♆',
  '9': '♇',
  '10': 'Asc',
  '11': 'MC',
  SUN: '☉',
  MOON: '☽',
  MERCURY: '☿',
  VENUS: '♀',
  MARS: '♂',
  JUPITER: '♃',
  SATURN: '♄',
  URANUS: '♅',
  NEPTUNE: '♆',
  PLUTO: '♇',
}

const ASPECT_LABELS: Record<number, string> = {
  0: '合相(0°)',
  30: '十二分相(30°)',
  36: '十分相(36°)',
  45: '八分相(45°)',
  60: '六合相(60°)',
  72: '五分相(72°)',
  90: '刑相(90°)',
  120: '拱相(120°)',
  135: '补八分相(135°)',
  144: '补五分相(144°)',
  150: '梅花相(150°)',
  180: '拱相(180°)',
}

const ZODIAC_SIGNS: ZodiacInfo[] = [
  { end: 120, sign: 'capricorn', name: '摩羯座' },
  { end: 219, sign: 'aquarius', name: '水瓶座' },
  { end: 320, sign: 'pisces', name: '双鱼座' },
  { end: 420, sign: 'aries', name: '白羊座' },
  { end: 521, sign: 'taurus', name: '金牛座' },
  { end: 622, sign: 'gemini', name: '双子座' },
  { end: 723, sign: 'cancer', name: '巨蟹座' },
  { end: 823, sign: 'leo', name: '狮子座' },
  { end: 923, sign: 'virgo', name: '处女座' },
  { end: 1024, sign: 'libra', name: '天秤座' },
  { end: 1123, sign: 'scorpio', name: '天蝎座' },
  { end: 1222, sign: 'sagittarius', name: '射手座' },
  { end: 1231, sign: 'capricorn', name: '摩羯座' },
]

function emptyProfile(): ProfileView {
  return {
    name: '',
    birthTime: '',
    birthPlace: '',
    zodiac: 'capricorn',
    zodiacName: '',
  }
}

function normalizedCodes(values: Array<string | number> = []): Set<string> {
  return new Set(values.map((value) => String(value).trim().toUpperCase()))
}

function getZodiac(birthTime: string): ZodiacInfo {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthTime.trim())
  const monthDay = match ? Number(match[2]) * 100 + Number(match[3]) : 1231
  return ZODIAC_SIGNS.find(({ end }) => monthDay <= end) ?? ZODIAC_SIGNS[0]
}

function formatBirthTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value.trim())
  if (!match) return value.replace('T', ' ').slice(0, 16)
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日 ${match[4]}:${match[5]}`
}

function bodyGlyph(planet: Planet): string {
  const normalizedCode = planet.code_name.trim().toUpperCase()
  return PLANET_SYMBOLS[planet.code_name] ?? PLANET_SYMBOLS[normalizedCode] ?? planet.planet_font ?? '•'
}

function bodyName(planet: Planet): string {
  return planet.planet_chinese.trim() || planet.planet_english?.trim() || planet.code_name
}

function toBodyRow(planet: Planet, color: string, index: number): BodyRow {
  return {
    id: `${planet.code_name}-${index}`,
    glyph: bodyGlyph(planet),
    name: bodyName(planet),
    color,
    position: `${planet.sign.sign_chinese} ${planet.sign.deg}°${planet.sign.min}′`,
    house: `${planet.house_id}宫`,
    status: Number(planet.speed) < 0 ? '逆行' : '',
  }
}

function aspectLabel(value: number): string {
  const rounded = Math.round(Math.abs(value))
  return ASPECT_LABELS[rounded] ?? `${rounded}°`
}

function toAspectRows(planets: Planet[]): AspectRow[] {
  const rows: AspectRow[] = []
  const emitted = new Set<string>()
  planets.forEach((planet) => {
    ;(planet.planet_allow_degree ?? []).forEach((target) => {
      const pair = [planet.code_name, target.code_name].sort()
      const id = `${pair[0]}:${pair[1]}:${target.allow}`
      if (emitted.has(id)) return
      emitted.add(id)
      rows.push({
        id,
        bodies: `${bodyName(planet)} — ${target.planet_chinese || target.planet_english || target.code_name}`,
        aspect: aspectLabel(target.allow),
        orb: `${target.deg}°${target.min}′${target.sec}″`,
      })
    })
  })
  return rows
}

Page({
  data: {
    navigationReady: false,
    navigationBarHeight: 0,
    statusBarHeight: 0,
    loadState: 'loading' as LoadState,
    errorMessage: '',
    isSharing: false,
    profile: emptyProfile(),
    planetRows: [] as BodyRow[],
    asteroidRows: [] as BodyRow[],
    virtualPointRows: [] as BodyRow[],
    aspectRows: [] as AspectRow[],
  },

  onLoad() {
    this.initNavigation()
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on?.('astrolabeParametersData', (data: ParametersTransfer) => {
      this.applyTransfer(data)
    })

    setTimeout(() => {
      if (this.data.loadState === 'loading') {
        this.setData({
          loadState: 'error',
          errorMessage: '没有读取到星图参数，请返回星图后重试。',
        })
      }
    }, 800)
  },

  initNavigation() {
    try {
      const windowInfo = wx.getWindowInfo()
      const menuButton = wx.getMenuButtonBoundingClientRect()
      const statusBarHeight = windowInfo.statusBarHeight
      const navigationBarHeight = menuButton.bottom + menuButton.top - statusBarHeight
      if (
        windowInfo.windowWidth <= 0
        || statusBarHeight < 0
        || menuButton.width <= 0
        || menuButton.height <= 0
        || navigationBarHeight <= statusBarHeight
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

  async shareParametersImage(): Promise<void> {
    if (this.data.isSharing || this.data.loadState !== 'ready') return
    this.setData({ isSharing: true })
    wx.showLoading({ title: '正在生成长图', mask: true })
    try {
      const path = await exportParametersImage(this.data)
      wx.hideLoading()
      if (wx.canIUse('showShareImageMenu')) {
        await wx.showShareImageMenu({ path, needShowEntrance: false })
      } else {
        await wx.previewImage({ current: path, urls: [path] })
      }
    } catch (error) {
      wx.hideLoading()
      const message = error instanceof Error ? error.message
        : (error as WechatMiniprogram.GeneralCallbackResult | null)?.errMsg ?? ''
      if (!message.toLowerCase().includes('cancel')) {
        console.warn('分享星图参数长图失败', error)
        const title = message.includes('not supported') || message.includes('initScl')
          ? '请在手机微信中使用图片分享' : '生成或分享长图失败，请重试'
        wx.showToast({ title, icon: 'none' })
      }
    } finally {
      this.setData({ isSharing: false })
    }
  },

  applyTransfer({ archive, payload }: ParametersTransfer) {
    if (!archive || !payload || !Array.isArray(payload.planet)) {
      this.setData({
        loadState: 'error',
        errorMessage: '星图参数数据无效，请返回重试。',
      })
      return
    }

    const asteroidCodes = normalizedCodes(payload.user?.planet_xs)
    const virtualCodes = normalizedCodes(payload.user?.virtual)
    const fixedStarCodes = normalizedCodes(payload.user?.planet_xf)
    const planetRows: BodyRow[] = []
    const asteroidRows: BodyRow[] = []
    const virtualPointRows: BodyRow[] = []
    let colorIndex = 0

    payload.planet.forEach((planet, index) => {
      const normalizedCode = planet.code_name.trim().toUpperCase()
      if (fixedStarCodes.has(normalizedCode)) return
      const row = toBodyRow(
        planet,
        BODY_COLORS[colorIndex % BODY_COLORS.length],
        index,
      )
      colorIndex += 1
      if (asteroidCodes.has(normalizedCode)) {
        asteroidRows.push(row)
      } else if (
        virtualCodes.has(normalizedCode)
        || normalizedCode === '10'
        || normalizedCode === '11'
        || normalizedCode === 'ASC'
        || normalizedCode === 'MC'
      ) {
        virtualPointRows.push(row)
      } else {
        planetRows.push(row)
      }
    })

    const zodiac = getZodiac(archive.birth_time)
    this.setData({
      loadState: 'ready',
      errorMessage: '',
      profile: {
        name: archive.name.trim(),
        birthTime: formatBirthTime(archive.birth_time),
        birthPlace: archive.birth_place.trim(),
        zodiac: zodiac.sign,
        zodiacName: zodiac.name,
      },
      planetRows,
      asteroidRows,
      virtualPointRows,
      aspectRows: toAspectRows(payload.planet),
    })
  },
})
