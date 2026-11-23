import { ZODIAC_AVATARS } from './images'
import type { ZodiacSign } from './images'

Component({
  properties: {
    zodiac: {
      type: String,
      value: 'capricorn',
    },
    label: {
      type: String,
      value: '星座头像',
    },
  },

  data: {
    avatarSrc: ZODIAC_AVATARS.capricorn as string,
  },

  observers: {
    zodiac(value: string) {
      const sign = value.trim().toLowerCase()
      const avatarSrc = Object.prototype.hasOwnProperty.call(ZODIAC_AVATARS, sign)
        ? ZODIAC_AVATARS[sign as ZodiacSign]
        : ZODIAC_AVATARS.capricorn
      this.setData({ avatarSrc })
    },
  },
})
