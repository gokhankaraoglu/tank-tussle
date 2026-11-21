import type { CanvasGradientLike } from '@tank-tussle/client-core'
import {
  matchFont,
  Skia,
  type SkColor,
  type SkFont,
  type SkShader,
} from '@shopify/react-native-skia'
import { Platform } from 'react-native'

const SYSTEM_FONT = Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' })

const colors = new Map<string, SkColor>()
export const parseColor = (css: string): SkColor => {
  let color = colors.get(css)
  if (!color) {
    color = Skia.Color(css)
    colors.set(css, color)
  }
  return color
}

const fonts = new Map<string, SkFont>()
/** Understands the CSS shorthand the painters use, e.g. `600 13px "Exo 2", sans-serif`. */
export const parseFont = (css: string): SkFont => {
  let font = fonts.get(css)
  if (!font) {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(css)?.[1] ?? 12)
    const bold = /^\s*(bold|[6-9]00)\b/.test(css)
    font = matchFont({ fontFamily: SYSTEM_FONT, fontSize: size, fontWeight: bold ? '700' : '400' })
    fonts.set(css, font)
  }
  return font
}

/** Collects colour stops like a CanvasGradient and turns them into a Skia shader on first use. */
export class SkiaGradient implements CanvasGradientLike {
  private readonly stops: { offset: number; color: string }[] = []
  private shader: SkShader | null = null

  constructor(private readonly build: (colors: SkColor[], positions: number[]) => SkShader) {}

  addColorStop(offset: number, color: string): void {
    this.stops.push({ offset, color })
    this.shader = null
  }

  toShader(): SkShader {
    this.shader ??= this.build(
      this.stops.map((stop) => parseColor(stop.color)),
      this.stops.map((stop) => stop.offset),
    )
    return this.shader
  }
}

export class SkiaPattern {
  constructor(readonly shader: SkShader) {}
}
