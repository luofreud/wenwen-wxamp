import { ZODIAC_AVATARS } from '../components/zodiac-avatar/images'
import type { ZodiacSign } from '../components/zodiac-avatar/images'

export interface ProfileView {
  name: string
  birthTime: string
  birthPlace: string
  zodiac: ZodiacSign
  zodiacName: string
}

export interface BodyRow {
  id: string
  glyph: string
  name: string
  color: string
  position: string
  house: string
  status: string
}

export interface AspectRow {
  id: string
  bodies: string
  aspect: string
  orb: string
}

interface ParametersImageData {
  profile: ProfileView
  planetRows: BodyRow[]
  asteroidRows: BodyRow[]
  virtualPointRows: BodyRow[]
  aspectRows: AspectRow[]
}

type Context = WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D
type ExportCanvas = Pick<WechatMiniprogram.Canvas, 'width' | 'height' | 'createImage'> & {
  getContext(type: '2d'): Context
}

interface ImageCell {
  text: string
  glyph?: string
  color?: string
}

interface ImageRow {
  cells: ImageCell[]
  lines: string[][]
  height: number
}

interface ImageSection {
  title: string
  color: string
  headers: string[]
  widths: number[]
  rows: ImageRow[]
}

const WIDTH = 750
const PADDING = 32
const TABLE_WIDTH = WIDTH - PADDING * 2
const LINE_HEIGHT = 34

function font(context: Context, size: number, bold = false): void {
  context.font = `${bold ? '600 ' : ''}${size}px sans-serif`
}

function wrapText(context: Context, text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const character of text) {
    if (character === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    if (line && context.measureText(line + character).width > width) {
      lines.push(line)
      line = character
    } else {
      line += character
    }
  }
  lines.push(line)
  return lines
}

function bodyCells(rows: BodyRow[]): ImageCell[][] {
  return rows.map((row) => [
    { text: row.name, glyph: row.glyph, color: row.color },
    { text: row.position },
    { text: row.house },
    { text: row.status },
  ])
}

function createSections(context: Context, data: ParametersImageData): ImageSection[] {
  const bodyHeaders = ['星体', '星座度数', '宫位', '状态']
  const bodyWidths = [0.26, 0.34, 0.2, 0.2]
  const sections: Array<{
    title: string
    color: string
    headers: string[]
    widths: number[]
    cells: ImageCell[][]
  }> = [
    { title: '行星信息', color: '#dceeff', headers: bodyHeaders, widths: bodyWidths, cells: bodyCells(data.planetRows) },
    { title: '小行星信息', color: '#fbebd8', headers: bodyHeaders, widths: bodyWidths, cells: bodyCells(data.asteroidRows) },
    { title: '虚点信息', color: '#e2f3ea', headers: bodyHeaders, widths: bodyWidths, cells: bodyCells(data.virtualPointRows) },
    {
      title: '星体相位', color: '#dee0ff', headers: ['星体', '相位', '容许度'], widths: [0.46, 0.27, 0.27],
      cells: data.aspectRows.map((row) => [{ text: row.bodies }, { text: row.aspect }, { text: row.orb }]),
    },
  ]
  font(context, 28)
  return sections.filter((section) => section.cells.length).map((section) => {
    const widths = section.widths.map((ratio) => ratio * TABLE_WIDTH)
    const rows = section.cells.map((cells) => {
      const lines = cells.map((cell, index) => wrapText(
        context, cell.text, widths[index] - 24 - (cell.glyph ? context.measureText(cell.glyph).width + 12 : 0),
      ))
      return { cells, lines, height: Math.max(80, ...lines.map((value) => value.length * LINE_HEIGHT + 24)) }
    })
    return { ...section, widths, rows }
  })
}

function drawLines(context: Context, lines: string[], x: number, centerY: number): void {
  const top = centerY - (lines.length - 1) * LINE_HEIGHT / 2
  lines.forEach((line, index) => context.fillText(line, x, top + index * LINE_HEIGHT))
}

function roundedRect(context: Context, x: number, y: number, width: number, height: number): void {
  const radius = 24
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

function drawSection(context: Context, section: ImageSection, top: number): number {
  context.textAlign = 'left'
  context.fillStyle = '#333333'
  font(context, 36, true)
  context.fillText(section.title, PADDING, top + 22)
  const tableTop = top + 76
  const tableHeight = 80 + section.rows.reduce((sum, row) => sum + row.height, 0)
  context.save()
  roundedRect(context, PADDING, tableTop, TABLE_WIDTH, tableHeight)
  context.clip()
  context.fillStyle = section.color
  context.fillRect(PADDING, tableTop, TABLE_WIDTH, 80)
  context.textAlign = 'center'
  font(context, 30, true)
  context.fillStyle = '#444444'
  let x = PADDING
  section.headers.forEach((header, index) => {
    context.fillText(header, x + section.widths[index] / 2, tableTop + 40)
    x += section.widths[index]
  })
  let y = tableTop + 80
  font(context, 28)
  context.strokeStyle = '#e8e8e8'
  context.lineWidth = 1
  section.rows.forEach((row) => {
    context.beginPath()
    context.moveTo(PADDING, y)
    context.lineTo(WIDTH - PADDING, y)
    context.stroke()
    let left = PADDING
    row.cells.forEach((cell, index) => {
      const width = section.widths[index]
      const centerY = y + row.height / 2
      context.fillStyle = '#444444'
      if (cell.glyph) {
        const glyphWidth = context.measureText(cell.glyph).width
        const nameWidth = Math.max(...row.lines[index].map((line) => context.measureText(line).width))
        const start = left + (width - glyphWidth - 12 - nameWidth) / 2
        context.textAlign = 'left'
        context.fillStyle = cell.color ?? '#444444'
        context.fillText(cell.glyph, start, centerY)
        context.fillStyle = '#444444'
        drawLines(context, row.lines[index], start + glyphWidth + 12, centerY)
      } else {
        context.textAlign = 'center'
        drawLines(context, row.lines[index], left + width / 2, centerY)
      }
      left += width
    })
    y += row.height
  })
  x = PADDING
  section.widths.slice(0, -1).forEach((width) => {
    x += width
    context.beginPath()
    context.moveTo(x, tableTop)
    context.lineTo(x, tableTop + tableHeight)
    context.stroke()
  })
  context.restore()
  roundedRect(context, PADDING, tableTop, TABLE_WIDTH, tableHeight)
  context.strokeStyle = '#e8e8e8'
  context.lineWidth = 1
  context.stroke()
  return tableTop + tableHeight
}

function loadAvatar(canvas: ExportCanvas, sign: ZodiacSign): Promise<WechatMiniprogram.Image> {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage()
    const timer = setTimeout(() => reject(new Error('星座头像加载超时')), 10000)
    image.onload = () => {
      clearTimeout(timer)
      resolve(image)
    }
    image.onerror = () => {
      clearTimeout(timer)
      reject(new Error('星座头像加载失败'))
    }
    image.src = ZODIAC_AVATARS[sign]
  })
}

async function drawParametersImage(canvas: ExportCanvas, data: ParametersImageData): Promise<string> {
  const context = canvas.getContext('2d')
  // Layout uses the full data set, independent of the viewport and scroll position.
  const sections = createSections(context, data)
  font(context, 32, true)
  const nameLines = wrapText(context, data.profile.name, 526)
  font(context, 28)
  const timeLines = wrapText(context, `出生时间：${data.profile.birthTime}`, 526)
  const placeLines = wrapText(context, `出生地：${data.profile.birthPlace}`, 526)
  const profileHeight = Math.max(152, (nameLines.length + timeLines.length + placeLines.length) * LINE_HEIGHT + 40)
  const height = 128 + profileHeight + sections.reduce((sum, section) => (
    sum + 40 + 76 + 80 + section.rows.reduce((total, row) => total + row.height, 0)
  ), 0) + 48
  // Bound bitmap memory for long aspect tables without omitting any rows.
  const scale = Math.min(2, 8192 / height, Math.sqrt(12000000 / (WIDTH * height)))
  canvas.width = Math.floor(WIDTH * scale)
  canvas.height = Math.floor(height * scale)
  context.scale(scale, scale)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, WIDTH, height)
  context.textBaseline = 'middle'
  context.textAlign = 'center'
  context.fillStyle = '#333333'
  font(context, 36, true)
  context.fillText('星图参数', WIDTH / 2, 48)

  const avatar = await loadAvatar(canvas, data.profile.zodiac)
  const avatarTop = 128 + (profileHeight - 128) / 2
  context.save()
  context.beginPath()
  context.arc(96, avatarTop + 64, 64, 0, Math.PI * 2)
  context.clip()
  context.fillStyle = '#f1f2f5'
  context.fillRect(32, avatarTop, 128, 128)
  const avatarScale = Math.min(128 / avatar.width, 128 / avatar.height)
  const avatarWidth = avatar.width * avatarScale
  const avatarHeight = avatar.height * avatarScale
  context.drawImage(avatar, 32 + (128 - avatarWidth) / 2, avatarTop + (128 - avatarHeight) / 2, avatarWidth, avatarHeight)
  context.restore()
  context.textAlign = 'left'
  context.fillStyle = '#383838'
  font(context, 32, true)
  let y = 148
  nameLines.forEach((line) => {
    context.fillText(line, 192, y)
    y += LINE_HEIGHT
  })
  y += 16
  font(context, 28)
  context.fillStyle = '#666666'
  timeLines.concat(placeLines).forEach((line) => {
    context.fillText(line, 192, y)
    y += LINE_HEIGHT
  })
  y = 128 + profileHeight
  sections.forEach((section) => { y = drawSection(context, section, y + 40) })

  // Let WeChat create a temporary image path. In base library 2.32.3,
  // showShareImageMenu rejects DevTools user-directory paths (http://usr/).
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      destWidth: canvas.width,
      destHeight: canvas.height,
      fileType: 'png',
      success: ({ tempFilePath }) => resolve(tempFilePath),
      fail: reject,
    })
  })
}

export async function exportParametersImage(data: ParametersImageData): Promise<string> {
  // A page canvas enters the 2.32.3 renderer's broken _getData update path.
  // This export-only canvas never attaches to the page rendering tree.
  const canvas: ExportCanvas = wx.createOffscreenCanvas({ type: '2d', width: 1, height: 1 })
  try {
    return await drawParametersImage(canvas, data)
  } finally {
    canvas.width = 1
    canvas.height = 1
  }
}
