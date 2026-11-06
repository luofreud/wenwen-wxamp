interface NamedColor {
  name: string
  hex: string
}

const DEFAULT_COLOR_HEX = '#FFFFFF'

const NAMED_COLOR_PALETTE: readonly NamedColor[] = [
  { name: '白色', hex: '#FFFFFF' },
  { name: '米白色', hex: '#F5F1E8' },
  { name: '象牙白', hex: '#FFFFF0' },
  { name: '珍珠白', hex: '#F8F6F0' },
  { name: '奶油色', hex: '#FFF4D6' },
  { name: '杏仁白', hex: '#F4E8D5' },
  { name: '黑色', hex: '#1F1F1F' },
  { name: '墨黑色', hex: '#101820' },
  { name: '炭黑色', hex: '#2B2B2B' },
  { name: '灰色', hex: '#9E9E9E' },
  { name: '浅灰色', hex: '#D3D3D3' },
  { name: '深灰色', hex: '#555555' },
  { name: '银灰色', hex: '#B8BCC2' },
  { name: '烟灰色', hex: '#708090' },
  { name: '蓝灰色', hex: '#6E7F91' },
  { name: '红色', hex: '#E53935' },
  { name: '正红色', hex: '#D7000F' },
  { name: '大红色', hex: '#E60012' },
  { name: '中国红', hex: '#C8102E' },
  { name: '朱红色', hex: '#D23A2E' },
  { name: '绯红色', hex: '#C83C5A' },
  { name: '猩红色', hex: '#DC143C' },
  { name: '酒红色', hex: '#8E2430' },
  { name: '枣红色', hex: '#7C1823' },
  { name: '玫瑰红', hex: '#C7365F' },
  { name: '珊瑚红', hex: '#F05A5A' },
  { name: '砖红色', hex: '#B55239' },
  { name: '橙色', hex: '#F28C28' },
  { name: '橙红色', hex: '#F05A28' },
  { name: '橘色', hex: '#FF8C00' },
  { name: '橘红色', hex: '#FF4500' },
  { name: '杏色', hex: '#F3B27A' },
  { name: '琥珀色', hex: '#D97706' },
  { name: '南瓜色', hex: '#D96B27' },
  { name: '蜜橙色', hex: '#F6A623' },
  { name: '黄色', hex: '#F4D03F' },
  { name: '明黄色', hex: '#FFD400' },
  { name: '金黄色', hex: '#F2B705' },
  { name: '柠檬黄', hex: '#F8E71C' },
  { name: '鹅黄色', hex: '#FFF1A8' },
  { name: '姜黄色', hex: '#D8A31A' },
  { name: '米黄色', hex: '#E8D8A8' },
  { name: '卡其色', hex: '#B7A36A' },
  { name: '香槟色', hex: '#E8D5A9' },
  { name: '绿色', hex: '#43A047' },
  { name: '浅绿色', hex: '#8BCF88' },
  { name: '深绿色', hex: '#1B5E20' },
  { name: '翠绿色', hex: '#00A86B' },
  { name: '碧绿色', hex: '#2E8B57' },
  { name: '草绿色', hex: '#6BBF59' },
  { name: '墨绿色', hex: '#0B3D2E' },
  { name: '豆绿色', hex: '#9FC6A0' },
  { name: '薄荷绿', hex: '#98D8C8' },
  { name: '青绿色', hex: '#2AA889' },
  { name: '橄榄绿', hex: '#708238' },
  { name: '松石绿', hex: '#40B5AD' },
  { name: '孔雀绿', hex: '#00A693' },
  { name: '青色', hex: '#00A6A6' },
  { name: '靛青色', hex: '#3F51B5' },
  { name: '藏青色', hex: '#1F3A5F' },
  { name: '蓝色', hex: '#2F6BFF' },
  { name: '天蓝色', hex: '#6EC6FF' },
  { name: '浅蓝色', hex: '#91C9F7' },
  { name: '湖蓝色', hex: '#2A9DDB' },
  { name: '海蓝色', hex: '#1677B3' },
  { name: '宝蓝色', hex: '#1E4DB7' },
  { name: '湛蓝色', hex: '#0067A5' },
  { name: '蔚蓝色', hex: '#3C9DD0' },
  { name: '碧蓝色', hex: '#007BA7' },
  { name: '深蓝色', hex: '#173F7A' },
  { name: '藏蓝色', hex: '#142B52' },
  { name: '雾霾蓝', hex: '#7896A8' },
  { name: '牛仔蓝', hex: '#4F6D8A' },
  { name: '孔雀蓝', hex: '#006D77' },
  { name: '紫色', hex: '#7E57C2' },
  { name: '浅紫色', hex: '#B39DDB' },
  { name: '淡紫色', hex: '#C5B3E6' },
  { name: '深紫色', hex: '#512DA8' },
  { name: '葡萄紫', hex: '#6F3C7E' },
  { name: '薰衣草紫', hex: '#967BB6' },
  { name: '丁香紫', hex: '#B58DB6' },
  { name: '紫罗兰', hex: '#8F5AA8' },
  { name: '梅子紫', hex: '#6A2E55' },
  { name: '粉色', hex: '#F48FB1' },
  { name: '粉红色', hex: '#F4A6B8' },
  { name: '浅粉色', hex: '#F8C8D8' },
  { name: '桃粉色', hex: '#F5A0A8' },
  { name: '樱花粉', hex: '#F6C1CC' },
  { name: '玫瑰粉', hex: '#E98AA8' },
  { name: '裸粉色', hex: '#D9A6A1' },
  { name: '豆沙粉', hex: '#C9828B' },
  { name: '珊瑚粉', hex: '#F38B83' },
  { name: '棕色', hex: '#795548' },
  { name: '浅棕色', hex: '#A67B5B' },
  { name: '深棕色', hex: '#4E342E' },
  { name: '咖啡色', hex: '#6F4E37' },
  { name: '巧克力色', hex: '#5C3317' },
  { name: '栗色', hex: '#7B3F00' },
  { name: '驼色', hex: '#B08A61' },
  { name: '茶色', hex: '#8B6F47' },
  { name: '金色', hex: '#D4AF37' },
  { name: '玫瑰金', hex: '#B76E79' },
  { name: '银色', hex: '#C0C0C0' },
  { name: '铜色', hex: '#B87333' },
]

const normalizeColorName = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s·・、，,。]/g, '')
}

const colorNameCore = (value: string): string => {
  return normalizeColorName(value).replace(/(?:颜色|色)$/u, '')
}

const commonCharacterCount = (left: string, right: string): number => {
  const leftCharacters = new Set(Array.from(left))
  const rightCharacters = new Set(Array.from(right))
  return Array.from(leftCharacters).filter((character) => {
    return rightCharacters.has(character)
  }).length
}

const resolveNamedColor = (name: string): string => {
  const normalizedName = normalizeColorName(name)
  if (!normalizedName) return DEFAULT_COLOR_HEX

  const exactMatch = NAMED_COLOR_PALETTE.find((color) => {
    return normalizeColorName(color.name) === normalizedName
  })
  if (exactMatch) return exactMatch.hex

  const nameCore = colorNameCore(normalizedName)
  if (!nameCore) return DEFAULT_COLOR_HEX

  const coreMatch = NAMED_COLOR_PALETTE.find((color) => {
    return colorNameCore(color.name) === nameCore
  })
  if (coreMatch) return coreMatch.hex

  let bestMatch: NamedColor | null = null
  let bestScore = 0

  for (const color of NAMED_COLOR_PALETTE) {
    const candidateCore = colorNameCore(color.name)
    if (!candidateCore) continue

    const commonCount = commonCharacterCount(nameCore, candidateCore)
    const containsName = nameCore.includes(candidateCore) || candidateCore.includes(nameCore)
    if (commonCount < 2 && !containsName) continue

    const longestLength = Math.max(nameCore.length, candidateCore.length)
    const similarity = longestLength > 0 ? commonCount / longestLength : 0
    const containmentBonus = containsName ? candidateCore.length * 30 : 0
    const score = commonCount * 100 + similarity * 20 + containmentBonus

    if (score > bestScore) {
      bestMatch = color
      bestScore = score
    }
  }

  return bestMatch?.hex ?? DEFAULT_COLOR_HEX
}

export { DEFAULT_COLOR_HEX, NAMED_COLOR_PALETTE, resolveNamedColor }
export type { NamedColor }
