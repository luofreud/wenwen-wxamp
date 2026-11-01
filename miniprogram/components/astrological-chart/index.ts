import chartResponseSource from '../../assets/demo-data'
import ixingpanGlyphs, { VectorGlyph, VectorGlyphCommand } from '../../assets/fonts/ixingpan-glyphs'
import ixingpanCnGlyphs from '../../assets/fonts/ixingpancn-glyphs'

type ThemeName = 'degree' | 'stardust' | 'classic'
type ZodiacStyle = 'text' | 'symbol'

interface SignPosition {
  deg: number
  min: number
  sec: number
  sign_id: number
  sign_chinese: string
  sign_font: string
}

interface House {
  house_id: number
  house_life: string
  longitude: number
  sign: SignPosition
  main_planet: AstroBody[]
  planet_array: HousePlanet[]
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
  planet_font: string
  sign: SignPosition
  speed: string
  house_id: number
  house_deg: number
  house_min: number
  house_sec: number
  planet_allow_degree?: PlanetAspect[]
}

interface AstroBody {
  code_name: string
  planet_chinese: string
  planet_english: string
  planet_font: string
}

interface HousePlanet extends AstroBody {
  deg: number
  min: number
  sec: number
}

interface SignPlanet extends AstroBody {
  deg: number
  min: number
  sec: number
  sign_chinese: string
}

interface SignDetail {
  sign_id: number
  sign_chinese: string
  sign_font: string
  sign_attribute: string[]
  sign_guardian: AstroBody[]
  planet_array: SignPlanet[]
}

interface ChartPayload {
  house: House[]
  planet: Planet[]
  sign: SignDetail[]
  user: {
    format: string
    h_sys: string
    ay: string
    planets: string[]
    virtual: string[]
    phase: Record<string, number>
  }
}

interface ChartResponse {
  code: number
  data: ChartPayload
  msg: string
}

interface Point {
  x: number
  y: number
}

interface ChartTheme {
  background: string
  innerBackground: string
  ring: string
  secondRing: string
  thirdRing: string
  fourthRing: string
  line: string
  subtleLine: string
  text: string
  secondaryText: string
  houseText: string
  zodiacInnerFactor: number
}

interface CanvasRuntime {
  canvas: WechatMiniprogram.Canvas
  context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D
  width: number
  height: number
  pixelRatio: number
  detailTargets: DetailTarget[]
}

interface DetailTarget {
  x: number
  y: number
  radius: number
  type: 'planet' | 'house' | 'zodiac'
  key: string | number
}

interface DetailRow {
  label: string
  prefix: string
  symbol: string
  color: string
  text: string
}

interface DetailView {
  visible: boolean
  type: '' | 'planet' | 'house' | 'zodiac'
  title: string
  headerSymbol: string
  headerColor: string
  rows: DetailRow[]
  sectionTitle: string
  items: DetailRow[]
  emptyText: string
  note: string
}

interface CanvasField {
  node: WechatMiniprogram.Canvas
  width: number
  height: number
}

const chartResponse = chartResponseSource as ChartResponse

const DEFAULT_CHART_SETTINGS = Object.freeze({
  ayanamsa: -1,
  house: 'P',
  planets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  virtual: [10, 11],
  planetXs: [] as number[],
  planetXf: [] as number[],
  phase: { 0: 6, 60: 3, 90: 5, 120: 5, 180: 5 },
  format: 1,
})

const THEMES: Record<ThemeName, ChartTheme> = {
  degree: {
    background: '#f9f9f9',
    innerBackground: '#f9f9f9',
    ring: '#f9f9f9',
    secondRing: '#ececec',
    thirdRing: '#f9f9f9',
    fourthRing: '#f9f9f9',
    line: '#383838',
    subtleLine: '#e0e0e0',
    text: '#111111',
    secondaryText: '#9aa0a6',
    houseText: '#5f6368',
    zodiacInnerFactor: 0.9,
  },
  stardust: {
    background: '#c5c1b1',
    innerBackground: '#f7f3e9',
    ring: '#dac684',
    secondRing: '#d4ad98',
    thirdRing: '#bcccba',
    fourthRing: '#c5c1b1',
    line: '#6f6658',
    subtleLine: '#a59e8d',
    text: '#514a3e',
    secondaryText: '#876f61',
    houseText: '#6f6658',
    zodiacInnerFactor: 0.9,
  },
  classic: {
    background: '#07111f',
    innerBackground: '#07111f',
    ring: '#141c4b',
    secondRing: '#384673',
    thirdRing: 'rgba(0,0,0,0)',
    fourthRing: '#151e4e',
    line: '#8ea0c4',
    subtleLine: 'rgba(78,99,138,0.45)',
    text: '#e8eef8',
    secondaryText: '#8ea0c4',
    houseText: '#b7c4dd',
    zodiacInnerFactor: 0.8845,
  },
}

const ZODIAC_SYMBOLS = ['♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎']
const ZODIAC_FONT_CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const ZODIAC_NAMES = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼']
const ZODIAC_COLORS = [
  '#e35d5b', '#f2c94c', '#36a66a', '#327cf2',
  '#e35d5b', '#f2c94c', '#36a66a', '#327cf2',
  '#e35d5b', '#f2c94c', '#36a66a', '#327cf2',
]
const PLANET_COLORS: Record<string, string> = {
  '0': '#e5902e',
  '1': '#8c929b',
  '2': '#7b61d1',
  '3': '#36a66a',
  '4': '#e35d5b',
  '5': '#327cf2',
  '6': '#8a6a3f',
  '7': '#2ba8a8',
  '8': '#3f51b5',
  '9': '#7a2e2e',
  '10': '#e35d5b',
  '11': '#327cf2',
}
const PLANET_SYMBOLS: Record<string, string> = {
  '0': '☉︎',
  '1': '☽︎',
  '2': '☿︎',
  '3': '♀︎',
  '4': '♂︎',
  '5': '♃︎',
  '6': '♄︎',
  '7': '♅︎',
  '8': '♆︎',
  '9': '♇︎',
  '10': 'Asc',
  '11': 'MC',
}
const ASPECT_COLORS: Record<number, string> = {
  0: '#be8a4f',
  30: '#de8855',
  36: '#6c52e1',
  45: '#e1a558',
  60: '#4184dc',
  72: '#deca96',
  90: '#d94131',
  120: '#69ca9f',
  135: '#e4b77f',
  144: '#3e6857',
  150: '#7ca293',
  180: '#5034c8',
}
const STARDUST_SECTORS = ['#b1bec7', '#dac684', '#d4ac96', '#bccbb9']
const SYMBOL_SIZE_FACTOR = 0.78
const SYMBOL_RING_OFFSETS = [-24, -10, 4, 17, 29]
const TEXT_RING_OFFSETS = [-28, -12, 3, 17, 29]
const SYMBOL_RING_FONT_SIZES = [14, 8.5, 12, 8.5, 12]
const TEXT_RING_FONT_SIZES = [9, 8, 8, 8, 12]

const runtimeByInstance = new WeakMap<object, CanvasRuntime>()

function normalizeAngle(value: number): number {
  return ((value % 360) + 360) % 360
}

function responsiveScale(canvasSize: number): number {
  return Math.max(0.72, Math.min(canvasSize / 375, 1.8))
}

function mixHexWithWhite(color: string, amount: number): string {
  const value = Number.parseInt(color.slice(1), 16)
  const mix = (channel: number): number => Math.round(channel + (255 - channel) * amount)
  const red = mix((value >> 16) & 0xff)
  const green = mix((value >> 8) & 0xff)
  const blue = mix(value & 0xff)
  return `rgb(${red},${green},${blue})`
}

function createEmptyDetail(): DetailView {
  return {
    visible: false,
    type: '',
    title: '',
    headerSymbol: '',
    headerColor: '#111111',
    rows: [],
    sectionTitle: '',
    items: [],
    emptyText: '',
    note: '',
  }
}

function formatAspectDegree(value: number): string {
  return Number.isInteger(value) ? String(Math.round(value)) : String(value)
}

function pointOnCircle(center: Point, radius: number, longitude: number, ascDegree: number): Point {
  const radians = normalizeAngle(longitude + 180 - ascDegree) * Math.PI / 180
  return {
    x: center.x + radius * Math.cos(radians),
    y: center.y - radius * Math.sin(radians),
  }
}

function houseMidAngle(house: House, nextHouse: House): number {
  const width = normalizeAngle(nextHouse.longitude - house.longitude)
  return normalizeAngle(house.longitude + width / 2)
}

function resolvePlanetAngles(planets: Planet[]): Record<string, number> {
  const angles: Record<string, number> = {}
  planets.forEach((planet) => {
    angles[planet.code_name] = normalizeAngle(planet.longitude)
  })

  const minimumSeparation = Math.min(11, 360 / Math.max(planets.length, 1))
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const ordered = [...planets].sort((left, right) => angles[left.code_name] - angles[right.code_name])
    let changed = false
    ordered.forEach((planet, index) => {
      const next = ordered[(index + 1) % ordered.length]
      const currentAngle = angles[planet.code_name]
      const nextAngle = angles[next.code_name]
      const distance = normalizeAngle(nextAngle - currentAngle)
      if (distance >= minimumSeparation) return
      const shift = (minimumSeparation - distance) / 2
      angles[planet.code_name] = normalizeAngle(currentAngle - shift)
      angles[next.code_name] = normalizeAngle(nextAngle + shift)
      changed = true
    })
    if (!changed) break
  }
  return angles
}

function getPixelRatio(): number {
  try {
    return wx.getWindowInfo().pixelRatio
  } catch (_error) {
    return wx.getSystemInfoSync().pixelRatio
  }
}

function drawVectorGlyph(
  context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
  glyphs: Record<string, VectorGlyph>,
  character: string,
  centerX: number,
  centerY: number,
  size: number,
  color: string,
): boolean {
  const glyph = glyphs[character]
  if (!glyph) return false
  const [x1, y1, x2, y2] = glyph.b
  const scale = size / Math.max(y2 - y1, 1)
  const glyphCenterX = (x1 + x2) / 2
  const glyphCenterY = (y1 + y2) / 2
  const point = (command: VectorGlyphCommand, index: number): number => {
    const value = command[index]
    return typeof value === 'number' ? value : 0
  }
  const transformX = (value: number): number => centerX + (value - glyphCenterX) * scale
  const transformY = (value: number): number => centerY - (value - glyphCenterY) * scale

  context.beginPath()
  glyph.c.forEach((command) => {
    const type = command[0]
    if (type === 'M') {
      context.moveTo(transformX(point(command, 1)), transformY(point(command, 2)))
    } else if (type === 'L') {
      context.lineTo(transformX(point(command, 1)), transformY(point(command, 2)))
    } else if (type === 'C') {
      context.bezierCurveTo(
        transformX(point(command, 3)),
        transformY(point(command, 4)),
        transformX(point(command, 5)),
        transformY(point(command, 6)),
        transformX(point(command, 1)),
        transformY(point(command, 2)),
      )
    } else if (type === 'Q') {
      context.quadraticCurveTo(
        transformX(point(command, 3)),
        transformY(point(command, 4)),
        transformX(point(command, 1)),
        transformY(point(command, 2)),
      )
    } else if (type === 'Z') {
      context.closePath()
    }
  })
  context.fillStyle = color
  context.fill()
  return true
}

Component({
  properties: {},

  data: {
    theme: 'degree' as ThemeName,
    zodiacStyle: 'symbol' as ZodiacStyle,
    chartReady: false,
    settings: DEFAULT_CHART_SETTINGS,
    themeOptions: [
      { value: 'degree', label: '度数' },
      { value: 'stardust', label: '星尘' },
      { value: 'classic', label: '经典' },
    ],
    displayOptions: [
      { value: 'text', label: '文字' },
      { value: 'symbol', label: '符号' },
    ],
    detail: createEmptyDetail(),
  },

  lifetimes: {
    ready() {
      this.initializeCanvas()
    },
    detached() {
      runtimeByInstance.delete(this)
    },
  },

  methods: {
    initializeCanvas() {
      this.createSelectorQuery()
        .select('#astrolabe-canvas')
        .fields({ node: true, size: true })
        .exec((result) => {
          const field = result[0] as CanvasField
          const canvas = field.node as WechatMiniprogram.Canvas
          const width = field.width
          const height = field.height
          if (!canvas || !width || !height) return

          const pixelRatio = getPixelRatio()
          canvas.width = width * pixelRatio
          canvas.height = height * pixelRatio
          const context = canvas.getContext('2d')
          context.scale(pixelRatio, pixelRatio)
          runtimeByInstance.set(this, {
            canvas,
            context,
            width,
            height,
            pixelRatio,
            detailTargets: [],
          })
          this.setData({ chartReady: true })
          this.drawChart()
        })
    },

    drawChart() {
      const runtime = runtimeByInstance.get(this)
      if (!runtime) return
      const { context, width, height } = runtime
      const themeName = this.data.theme as ThemeName
      const style = this.data.zodiacStyle as ZodiacStyle
      const theme = THEMES[themeName]
      const payload = chartResponse.data
      const size = Math.min(width, height)
      const uiScale = responsiveScale(size)
      const center = { x: width / 2, y: height / 2 }
      const radius = Math.max(10, size / 2 - 2 * uiScale)
      const zodiacInner = radius * theme.zodiacInnerFactor
      const ringUnit = radius - zodiacInner
      const secondInner = zodiacInner - ringUnit * (2 / 3)
      const thirdInner = themeName === 'classic' ? secondInner : secondInner - ringUnit * 4.5
      const fourthOuter = thirdInner
      const fourthInner = Math.max(radius * 0.3, fourthOuter - ringUnit * (themeName === 'classic' ? 0.9 : 2 / 3))
      const ascDegree = payload.house.find((house) => house.house_id === 1)?.longitude ?? 0

      context.clearRect(0, 0, width, height)
      runtime.detailTargets = []

      this.drawRingBackground(context, center, radius, zodiacInner, secondInner, thirdInner, fourthInner, themeName, theme, ascDegree, uiScale)
      this.drawZodiac(context, center, radius, zodiacInner, ascDegree, themeName, theme, style, uiScale)
      this.drawHouses(context, center, themeName === 'classic' ? radius : thirdInner, fourthInner, ascDegree, themeName, theme, payload.house, uiScale)
      this.drawAspects(context, center, fourthInner, ascDegree, themeName, payload.planet, uiScale)
      this.drawHouseNumbers(context, center, themeName === 'classic' ? (radius + fourthInner) / 2 : (fourthOuter + fourthInner) / 2, ascDegree, themeName, theme, payload.house, uiScale)
      this.drawPlanets(context, center, themeName === 'classic' ? fourthInner * 0.76 : (secondInner + thirdInner) / 2, ascDegree, themeName, theme, style, payload.planet, uiScale)
    },

    drawRingBackground(
      context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
      center: Point,
      radius: number,
      zodiacInner: number,
      secondInner: number,
      thirdInner: number,
      fourthInner: number,
      themeName: ThemeName,
      theme: ChartTheme,
      ascDegree: number,
      uiScale: number,
    ) {
      const fillCircle = (circleRadius: number, color: string) => {
        context.beginPath()
        context.arc(center.x, center.y, circleRadius, 0, Math.PI * 2)
        context.fillStyle = color
        context.fill()
      }

      fillCircle(radius, theme.ring)
      if (themeName === 'stardust') {
        for (let index = 0; index < 12; index += 1) {
          const start = -normalizeAngle(index * 30 + 180 - ascDegree) * Math.PI / 180
          const end = start - Math.PI / 6
          context.beginPath()
          context.arc(center.x, center.y, radius, start, end, true)
          context.arc(center.x, center.y, zodiacInner, end, start, false)
          context.closePath()
          context.fillStyle = STARDUST_SECTORS[index % STARDUST_SECTORS.length]
          context.fill()
        }
      }
      fillCircle(zodiacInner, themeName === 'stardust' ? theme.innerBackground : theme.secondRing)
      fillCircle(secondInner, theme.innerBackground)
      if (themeName !== 'classic') {
        fillCircle(secondInner, themeName === 'stardust' ? theme.innerBackground : theme.thirdRing)
        fillCircle(thirdInner, theme.innerBackground)
      }
      fillCircle(thirdInner, themeName === 'stardust' ? theme.innerBackground : theme.fourthRing)
      fillCircle(fourthInner, theme.innerBackground)

      context.strokeStyle = theme.line
      context.lineWidth = uiScale
      ;[radius, zodiacInner, secondInner, thirdInner, fourthInner]
        .filter((value, index, values) => value > 0 && values.indexOf(value) === index)
        .forEach((circleRadius) => {
          context.beginPath()
          context.arc(center.x, center.y, circleRadius, 0, Math.PI * 2)
          context.stroke()
        })

      if (themeName === 'classic') {
        context.strokeStyle = '#4c77a2'
        for (let degree = 0; degree < 360; degree += 1) {
          const tickLength = degree % 30 === 0 ? 0.5 : degree % 5 === 0 ? 0.34 : 0.22
          const outer = pointOnCircle(center, radius, degree, ascDegree)
          const inner = pointOnCircle(center, radius - (radius - zodiacInner) * tickLength, degree, ascDegree)
          context.lineWidth = (degree % 30 === 0 ? 0.8 : 0.45) * uiScale
          context.beginPath()
          context.moveTo(outer.x, outer.y)
          context.lineTo(inner.x, inner.y)
          context.stroke()
        }
      }
    },

    drawZodiac(
      context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
      center: Point,
      radius: number,
      zodiacInner: number,
      ascDegree: number,
      themeName: ThemeName,
      theme: ChartTheme,
      style: ZodiacStyle,
      uiScale: number,
    ) {
      const contentRadius = (radius + zodiacInner) / 2
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      for (let signId = 0; signId < 12; signId += 1) {
        const dividerInner = pointOnCircle(center, zodiacInner, signId * 30, ascDegree)
        const dividerOuter = pointOnCircle(center, radius, signId * 30, ascDegree)
        context.strokeStyle = themeName === 'stardust' ? 'rgba(255,255,255,0.82)' : theme.subtleLine
        context.lineWidth = 0.8 * uiScale
        context.beginPath()
        context.moveTo(dividerInner.x, dividerInner.y)
        context.lineTo(dividerOuter.x, dividerOuter.y)
        context.stroke()

        const point = pointOnCircle(center, contentRadius, signId * 30 + 15, ascDegree)
        const label = style === 'symbol' ? ZODIAC_SYMBOLS[signId] : ZODIAC_NAMES[signId]
        const color = themeName === 'stardust' ? '#383838' : ZODIAC_COLORS[signId]
        const drewGlyph = style === 'symbol'
          && drawVectorGlyph(context, ixingpanGlyphs, ZODIAC_FONT_CHARS[signId], point.x, point.y, 17 * uiScale * SYMBOL_SIZE_FACTOR, color)
        if (!drewGlyph) {
          context.fillStyle = color
          context.font = `${(style === 'symbol' ? 17 * SYMBOL_SIZE_FACTOR : 10) * uiScale}px sans-serif`
          context.fillText(label, point.x, point.y)
        }
        runtimeByInstance.get(this)?.detailTargets.push({
          x: point.x,
          y: point.y,
          radius: 18 * uiScale,
          type: 'zodiac',
          key: signId,
        })
      }
    },

    drawHouses(
      context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
      center: Point,
      outerRadius: number,
      innerRadius: number,
      ascDegree: number,
      themeName: ThemeName,
      theme: ChartTheme,
      houses: House[],
      uiScale: number,
    ) {
      houses.forEach((house) => {
        const start = pointOnCircle(center, innerRadius, house.longitude, ascDegree)
        const end = pointOnCircle(center, outerRadius, house.longitude, ascDegree)
        const isAxis = [1, 4, 7, 10].includes(house.house_id)
        context.strokeStyle = themeName === 'classic'
          ? '#96af99'
          : themeName === 'stardust' && isAxis
            ? '#999999'
            : themeName === 'stardust'
              ? '#c5c1b8'
              : isAxis
                ? '#8c8c8c'
                : theme.subtleLine
        context.lineWidth = (isAxis ? 1.7 : 0.8) * uiScale
        context.beginPath()
        context.moveTo(start.x, start.y)
        context.lineTo(end.x, end.y)
        context.stroke()
      })
    },

    drawAspects(
      context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
      center: Point,
      radius: number,
      ascDegree: number,
      themeName: ThemeName,
      planets: Planet[],
      uiScale: number,
    ) {
      const planetByCode = new Map(planets.map((planet) => [planet.code_name, planet]))
      const emitted = new Set<string>()
      planets.forEach((planet) => {
        ;(planet.planet_allow_degree ?? []).forEach((aspect) => {
          const pair = [planet.code_name, aspect.code_name].sort()
          const key = `${pair[0]}:${pair[1]}:${aspect.allow}`
          if (emitted.has(key)) return
          emitted.add(key)
          const targetLongitude = planetByCode.get(aspect.code_name)?.longitude ?? aspect.current_longitude
          const start = pointOnCircle(center, radius, planet.longitude, ascDegree)
          const end = pointOnCircle(center, radius, targetLongitude, ascDegree)
          context.strokeStyle = ASPECT_COLORS[Math.round(aspect.allow)] ?? '#327cf2'
          context.globalAlpha = themeName === 'classic' ? 0.9 : 0.78
          context.lineWidth = (themeName === 'classic' ? 0.95 : 0.62) * uiScale
          context.beginPath()
          context.moveTo(start.x, start.y)
          context.lineTo(end.x, end.y)
          context.stroke()
        })
      })
      context.globalAlpha = 1
    },

    drawHouseNumbers(
      context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
      center: Point,
      radius: number,
      ascDegree: number,
      themeName: ThemeName,
      theme: ChartTheme,
      houses: House[],
      uiScale: number,
    ) {
      const ordered = [...houses].sort((left, right) => left.house_id - right.house_id)
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      const classicColorIndexes = [3, 8, 1, 10, 5, 0, 7, 2, 11, 4, 9, 6]
      ordered.forEach((house, index) => {
        const next = ordered[(index + 1) % ordered.length]
        const point = pointOnCircle(center, radius, houseMidAngle(house, next), ascDegree)
        context.fillStyle = themeName === 'classic'
          ? ZODIAC_COLORS[classicColorIndexes[(house.house_id - 1) % classicColorIndexes.length]]
          : theme.houseText
        context.font = `${11 * uiScale}px sans-serif`
        context.fillText(String(house.house_id), point.x, point.y)
        runtimeByInstance.get(this)?.detailTargets.push({
          x: point.x,
          y: point.y,
          radius: 16 * uiScale,
          type: 'house',
          key: house.house_id,
        })
      })
    },

    drawPlanets(
      context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
      center: Point,
      radius: number,
      ascDegree: number,
      themeName: ThemeName,
      theme: ChartTheme,
      style: ZodiacStyle,
      planets: Planet[],
      uiScale: number,
    ) {
      const displayAngles = resolvePlanetAngles(planets)
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      planets.forEach((planet) => {
        const angle = displayAngles[planet.code_name] ?? planet.longitude
        const point = pointOnCircle(center, radius, angle, ascDegree)
        runtimeByInstance.get(this)?.detailTargets.push({
          x: point.x,
          y: point.y,
          radius: (style === 'symbol' ? 32 : 36) * uiScale,
          type: 'planet',
          key: planet.code_name,
        })
        const anchor = pointOnCircle(center, radius + 10 * uiScale, planet.longitude, ascDegree)
        const planetColor = PLANET_COLORS[planet.code_name] ?? theme.text
        const color = themeName === 'classic' ? mixHexWithWhite(planetColor, 0.28) : planetColor
        const isRetrograde = Number(planet.speed) < 0

        if (Math.abs(normalizeAngle(angle - planet.longitude)) > 0.6) {
          context.strokeStyle = theme.secondaryText
          context.globalAlpha = 0.48
          context.lineWidth = 0.6 * uiScale
          context.beginPath()
          context.moveTo(anchor.x, anchor.y)
          context.lineTo(point.x, point.y)
          context.stroke()
          context.globalAlpha = 1
        }

        if (themeName === 'classic') {
          const glyphs = style === 'symbol' ? ixingpanGlyphs : ixingpanCnGlyphs
          const drewGlyph = drawVectorGlyph(
            context,
            glyphs,
            planet.planet_font,
            point.x,
            point.y,
            (style === 'symbol' ? 17 * SYMBOL_SIZE_FACTOR : 11) * uiScale,
            color,
          )
          if (!drewGlyph) {
            context.fillStyle = color
            context.font = `${(style === 'symbol' ? 17 * SYMBOL_SIZE_FACTOR : 10) * uiScale}px sans-serif`
            context.fillText(style === 'symbol' ? PLANET_SYMBOLS[planet.code_name] ?? '·' : planet.planet_chinese, point.x, point.y)
          }
          return
        }

        const radialX = point.x - center.x
        const radialY = point.y - center.y
        const length = Math.sqrt(radialX * radialX + radialY * radialY) || 1
        const unitX = radialX / length
        const unitY = radialY / length
        const entries = style === 'symbol'
          ? [PLANET_SYMBOLS[planet.code_name] ?? '·', String(planet.sign.deg), ZODIAC_SYMBOLS[planet.sign.sign_id], String(planet.sign.min), isRetrograde ? '℞' : '']
          : [planet.planet_chinese, String(planet.sign.deg), planet.sign.sign_chinese, String(planet.sign.min), isRetrograde ? '逆' : '']
        const offsets = (style === 'symbol' ? SYMBOL_RING_OFFSETS : TEXT_RING_OFFSETS)
          .map((value) => value * uiScale)
        const fontSizes = style === 'symbol' ? SYMBOL_RING_FONT_SIZES : TEXT_RING_FONT_SIZES
        entries.forEach((entry, index) => {
          if (!entry) return
          const entryColor = index === 0 || index === 2 || index === 4 ? color : index === 3 ? theme.secondaryText : theme.text
          const baseFontSize = fontSizes[index]
          const isSymbolGlyph = (style === 'symbol' && (index === 0 || index === 2)) || index === 4
          const fontSize = baseFontSize * uiScale * (isSymbolGlyph ? SYMBOL_SIZE_FACTOR : 1)
          const entryX = point.x + unitX * offsets[index]
          const entryY = point.y + unitY * offsets[index]
          const glyphCharacter = index === 0
            ? planet.planet_font
            : index === 2
              ? planet.sign.sign_font
              : index === 4
                ? 'Ú'
                : ''
          if (glyphCharacter) {
            const glyphs = index === 4
              ? ixingpanGlyphs
              : style === 'symbol'
                ? ixingpanGlyphs
                : ixingpanCnGlyphs
            if (drawVectorGlyph(context, glyphs, glyphCharacter, entryX, entryY, fontSize, entryColor)) {
              return
            }
          }
          context.fillStyle = entryColor
          context.font = `${fontSize}px sans-serif`
          context.fillText(entry, entryX, entryY)
        })
      })
    },

    handleCanvasDetailTap(event: WechatMiniprogram.TouchCanvas) {
      const touch = event.changedTouches[0]
      const runtime = runtimeByInstance.get(this)
      if (!touch || !runtime) return
      const target = [...runtime.detailTargets].reverse().find((item) => {
        const deltaX = touch.x - item.x
        const deltaY = touch.y - item.y
        return deltaX * deltaX + deltaY * deltaY <= item.radius * item.radius
      })
      if (!target) return

      if (target.type === 'planet') {
        this.openPlanetDetail(String(target.key))
      } else if (target.type === 'house') {
        this.openHouseDetail(Number(target.key))
      } else {
        this.openZodiacDetail(Number(target.key))
      }
    },

    openPlanetDetail(codeName: string) {
      const planet = chartResponse.data.planet.find((item) => item.code_name === codeName)
      if (!planet) return
      const color = PLANET_COLORS[planet.code_name] ?? '#111111'
      const detail: DetailView = {
        visible: true,
        type: 'planet',
        title: `${planet.planet_chinese}［${Number(planet.speed) < 0 ? '逆行' : '顺行'}］`,
        headerSymbol: PLANET_SYMBOLS[planet.code_name] ?? '•',
        headerColor: color,
        rows: [
          {
            label: '落入星座：',
            prefix: '',
            symbol: ZODIAC_SYMBOLS[planet.sign.sign_id] ?? '',
            color: ZODIAC_COLORS[planet.sign.sign_id] ?? '#111111',
            text: `${planet.sign.sign_chinese} ${planet.sign.deg}°${planet.sign.min}'${planet.sign.sec}\"`,
          },
          {
            label: '落入宫位：',
            prefix: '',
            symbol: '',
            color: '#111111',
            text: `${planet.house_id}宫${planet.house_deg}°${planet.house_min}'${planet.house_sec}\"`,
          },
        ],
        sectionTitle: '相位：（+为入相位，-为出相位）详情：',
        items: (planet.planet_allow_degree ?? []).map((aspect) => ({
          label: '',
          prefix: '与',
          symbol: PLANET_SYMBOLS[aspect.code_name] ?? '•',
          color: PLANET_COLORS[aspect.code_name] ?? '#111111',
          text: `${aspect.planet_chinese}成${formatAspectDegree(aspect.allow)}°${aspect.in_out === '1' ? '＋' : '-'}（${aspect.deg}°${aspect.min}'${aspect.sec}）`,
        })),
        emptyText: '暂无相位',
        note: '** 相位后括号内是容许度',
      }
      this.setData({ detail })
    },

    openHouseDetail(houseId: number) {
      const house = chartResponse.data.house.find((item) => item.house_id === houseId)
      if (!house) return
      const mainPlanet = house.main_planet[0]
      const detail: DetailView = {
        visible: true,
        type: 'house',
        title: `第${house.house_id}宫【${house.house_life}】`,
        headerSymbol: '',
        headerColor: '#111111',
        rows: [
          {
            label: '宫头：',
            prefix: '',
            symbol: ZODIAC_SYMBOLS[house.sign.sign_id] ?? '',
            color: ZODIAC_COLORS[house.sign.sign_id] ?? '#111111',
            text: `${house.sign.sign_chinese} ${house.sign.deg}°${house.sign.min}'${house.sign.sec}\"`,
          },
          {
            label: '宫主星：',
            prefix: '',
            symbol: mainPlanet ? PLANET_SYMBOLS[mainPlanet.code_name] ?? '•' : '',
            color: mainPlanet ? PLANET_COLORS[mainPlanet.code_name] ?? '#111111' : '#111111',
            text: `${house.main_planet.length ? house.main_planet.map((item) => item.planet_chinese).join('、') : '-'}　星体数：${house.planet_array.length}`,
          },
        ],
        sectionTitle: '详情：',
        items: house.planet_array.map((planet) => ({
          label: '',
          prefix: '',
          symbol: PLANET_SYMBOLS[planet.code_name] ?? '•',
          color: PLANET_COLORS[planet.code_name] ?? '#111111',
          text: `${planet.planet_chinese}第${house.house_id}宫 ${planet.deg}°${planet.min}'${planet.sec}\"`,
        })),
        emptyText: '暂无星体',
        note: '',
      }
      this.setData({ detail })
    },

    openZodiacDetail(signId: number) {
      const sign = chartResponse.data.sign.find((item) => item.sign_id === signId)
      if (!sign) return
      const guardian = sign.sign_guardian[0]
      const attributes = sign.sign_attribute.join('、')
      const detail: DetailView = {
        visible: true,
        type: 'zodiac',
        title: `${sign.sign_chinese}${attributes ? `-${attributes}` : ''}`,
        headerSymbol: ZODIAC_SYMBOLS[sign.sign_id] ?? '',
        headerColor: ZODIAC_COLORS[sign.sign_id] ?? '#111111',
        rows: [
          {
            label: '守护星：',
            prefix: '',
            symbol: guardian ? PLANET_SYMBOLS[guardian.code_name] ?? '•' : '',
            color: guardian ? PLANET_COLORS[guardian.code_name] ?? '#111111' : '#111111',
            text: sign.sign_guardian.length ? sign.sign_guardian.map((item) => item.planet_chinese).join('、') : '-',
          },
          {
            label: '星体数：',
            prefix: '',
            symbol: '',
            color: '#111111',
            text: String(sign.planet_array.length),
          },
        ],
        sectionTitle: '详情：',
        items: sign.planet_array.map((planet) => ({
          label: '',
          prefix: '',
          symbol: PLANET_SYMBOLS[planet.code_name] ?? '•',
          color: PLANET_COLORS[planet.code_name] ?? '#111111',
          text: `${planet.planet_chinese} ${planet.sign_chinese} ${planet.deg}°${planet.min}'${planet.sec}\"`,
        })),
        emptyText: '暂无星体',
        note: '',
      }
      this.setData({ detail })
    },

    closeDetail() {
      this.setData({ detail: createEmptyDetail() }, () => this.drawChart())
    },

    stopPropagation() {},

    selectTheme(event: WechatMiniprogram.TouchEvent) {
      const theme = event.currentTarget.dataset.theme as ThemeName
      if (!THEMES[theme] || theme === this.data.theme) return
      this.setData({ theme }, () => this.drawChart())
      this.triggerEvent('themechange', {
        theme,
        zodiacStyle: this.data.zodiacStyle,
      })
    },

    selectZodiacStyle(event: WechatMiniprogram.TouchEvent) {
      const zodiacStyle = event.currentTarget.dataset.style as ZodiacStyle
      if (!['text', 'symbol'].includes(zodiacStyle) || zodiacStyle === this.data.zodiacStyle) return
      this.setData({ zodiacStyle }, () => this.drawChart())
      this.triggerEvent('themechange', {
        theme: this.data.theme,
        zodiacStyle,
      })
    },

  },
})
