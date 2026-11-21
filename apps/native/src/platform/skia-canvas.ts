import type {
  Canvas2D,
  CanvasGradientLike,
  CanvasPaint,
  LayerImage,
} from '@tank-tussle/client-core'
import {
  ClipOp,
  FilterMode,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  type SkCanvas,
  type SkPaint,
  type SkPathBuilder,
  type SkPicture,
} from '@shopify/react-native-skia'
import { parseColor, parseFont, SkiaGradient, SkiaPattern } from './skia-paints'

const DEGREES = 180 / Math.PI
const FULL_TURN = Math.PI * 2 - 1e-6
const STROKE_CAPS = { butt: StrokeCap.Butt, round: StrokeCap.Round, square: StrokeCap.Square }

/** A layer the adapter can draw or tile: its contents as a picture, in drawing units. */
export interface PictureSource {
  readonly width: number
  readonly height: number
  snapshot(): SkPicture
}

const isPictureSource = (image: LayerImage): image is PictureSource =>
  typeof (image as Partial<PictureSource>).snapshot === 'function'

interface DrawState {
  fillStyle: CanvasPaint
  strokeStyle: CanvasPaint
  lineWidth: number
  lineCap: 'butt' | 'round' | 'square'
  lineDash: number[]
  lineDashOffset: number
  globalAlpha: number
  font: string
  textAlign: 'start' | 'end' | 'left' | 'right' | 'center'
}

const initialState = (): DrawState => ({
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  lineCap: 'butt',
  lineDash: [],
  lineDashOffset: 0,
  globalAlpha: 1,
  font: '10px sans-serif',
  textAlign: 'start',
})

/**
 * Implements the Canvas 2D subset the shared painters use on top of a Skia canvas, so React
 * Native draws the battlefield with exactly the same code as the browser.
 */
export class SkiaCanvas2D implements Canvas2D {
  private state = initialState()
  private readonly stack: DrawState[] = []
  private path: SkPathBuilder = Skia.PathBuilder.Make()
  private readonly paint: SkPaint = Skia.Paint()

  constructor(private readonly canvas: SkCanvas) {
    this.paint.setAntiAlias(true)
  }

  get fillStyle(): CanvasPaint {
    return this.state.fillStyle
  }
  set fillStyle(value: CanvasPaint) {
    this.state.fillStyle = value
  }
  get strokeStyle(): CanvasPaint {
    return this.state.strokeStyle
  }
  set strokeStyle(value: CanvasPaint) {
    this.state.strokeStyle = value
  }
  get lineWidth(): number {
    return this.state.lineWidth
  }
  set lineWidth(value: number) {
    this.state.lineWidth = value
  }
  get lineCap(): DrawState['lineCap'] {
    return this.state.lineCap
  }
  set lineCap(value: DrawState['lineCap']) {
    this.state.lineCap = value
  }
  get lineDashOffset(): number {
    return this.state.lineDashOffset
  }
  set lineDashOffset(value: number) {
    this.state.lineDashOffset = value
  }
  get globalAlpha(): number {
    return this.state.globalAlpha
  }
  set globalAlpha(value: number) {
    this.state.globalAlpha = value
  }
  get font(): string {
    return this.state.font
  }
  set font(value: string) {
    this.state.font = value
  }
  get textAlign(): DrawState['textAlign'] {
    return this.state.textAlign
  }
  set textAlign(value: DrawState['textAlign']) {
    this.state.textAlign = value
  }

  save(): void {
    this.stack.push({ ...this.state, lineDash: [...this.state.lineDash] })
    this.canvas.save()
  }

  restore(): void {
    const previous = this.stack.pop()
    if (!previous) return
    this.state = previous
    this.canvas.restore()
  }

  translate(x: number, y: number): void {
    this.canvas.translate(x, y)
  }

  rotate(radians: number): void {
    this.canvas.rotate(radians * DEGREES, 0, 0)
  }

  scale(x: number, y: number): void {
    this.canvas.scale(x, y)
  }

  beginPath(): void {
    this.path = Skia.PathBuilder.Make()
  }

  closePath(): void {
    this.path.close()
  }

  moveTo(x: number, y: number): void {
    this.path.moveTo(x, y)
  }

  lineTo(x: number, y: number): void {
    // Like the DOM: a lineTo on an empty path starts it.
    if (this.path.isEmpty()) this.path.moveTo(x, y)
    else this.path.lineTo(x, y)
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.path.quadTo(cpx, cpy, x, y)
  }

  arc(x: number, y: number, radius: number, start: number, end: number): void {
    if (Math.abs(end - start) >= FULL_TURN) {
      this.path.addCircle(x, y, radius)
      return
    }
    const oval = Skia.XYWHRect(x - radius, y - radius, radius * 2, radius * 2)
    this.path.arcToOval(oval, start * DEGREES, (end - start) * DEGREES, this.path.isEmpty())
  }

  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    start: number,
    end: number,
  ): void {
    const oval = Skia.XYWHRect(-radiusX, -radiusY, radiusX * 2, radiusY * 2)
    const shape = Skia.PathBuilder.Make()
    if (Math.abs(end - start) >= FULL_TURN) shape.addOval(oval)
    else shape.addArc(oval, start * DEGREES, (end - start) * DEGREES)
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    this.path.addPath(shape.build(), Skia.Matrix([cos, -sin, x, sin, cos, y, 0, 0, 1]))
  }

  roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.path.addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, width, height), radius, radius))
  }

  fill(): void {
    this.canvas.drawPath(this.path.build(), this.fillPaint())
  }

  stroke(): void {
    this.canvas.drawPath(this.path.build(), this.strokePaint())
  }

  clip(): void {
    this.canvas.clipPath(this.path.build(), ClipOp.Intersect, true)
  }

  setLineDash(segments: number[]): void {
    this.state.lineDash = segments
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.canvas.drawRect(Skia.XYWHRect(x, y, width, height), this.fillPaint())
  }

  /** Only whole-layer clears are supported; picture layers handle those themselves. */
  clearRect(): void {
    this.canvas.clear(Skia.Color('transparent'))
  }

  fillText(text: string, x: number, y: number): void {
    const font = parseFont(this.state.font)
    const align = this.state.textAlign
    const width =
      align === 'center' || align === 'right' || align === 'end' ? font.measureText(text).width : 0
    const left =
      align === 'center' ? x - width / 2 : align === 'right' || align === 'end' ? x - width : x
    this.canvas.drawText(text, left, y, this.fillPaint(), font)
  }

  drawImage(image: LayerImage, x: number, y: number, width: number, height: number): void {
    if (!isPictureSource(image)) return
    this.canvas.save()
    this.canvas.translate(x, y)
    this.canvas.scale(width / image.width, height / image.height)
    this.canvas.drawPicture(image.snapshot())
    this.canvas.restore()
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike {
    return new SkiaGradient((stops, positions) =>
      Skia.Shader.MakeLinearGradient(
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        stops,
        positions,
        TileMode.Clamp,
      ),
    )
  }

  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradientLike {
    return new SkiaGradient((stops, positions) =>
      Skia.Shader.MakeTwoPointConicalGradient(
        { x: x0, y: y0 },
        r0,
        { x: x1, y: y1 },
        r1,
        stops,
        positions,
        TileMode.Clamp,
      ),
    )
  }

  createPattern(image: LayerImage): object | null {
    if (!isPictureSource(image)) return null
    const tile = Skia.XYWHRect(0, 0, image.width, image.height)
    return new SkiaPattern(
      image
        .snapshot()
        .makeShader(TileMode.Repeat, TileMode.Repeat, FilterMode.Nearest, undefined, tile),
    )
  }

  private fillPaint(): SkPaint {
    this.paint.setStyle(PaintStyle.Fill)
    this.paint.setPathEffect(null)
    this.applyStyle(this.state.fillStyle)
    return this.paint
  }

  private strokePaint(): SkPaint {
    const { lineWidth, lineCap, lineDash, lineDashOffset } = this.state
    this.paint.setStyle(PaintStyle.Stroke)
    this.paint.setStrokeWidth(lineWidth)
    this.paint.setStrokeCap(STROKE_CAPS[lineCap])
    this.paint.setPathEffect(
      lineDash.length >= 2 ? Skia.PathEffect.MakeDash(lineDash, lineDashOffset) : null,
    )
    this.applyStyle(this.state.strokeStyle)
    return this.paint
  }

  private applyStyle(style: CanvasPaint): void {
    const alpha = this.state.globalAlpha
    if (typeof style === 'string') {
      const color = parseColor(style)
      this.paint.setShader(null)
      this.paint.setColor(Float32Array.of(color[0]!, color[1]!, color[2]!, color[3]! * alpha))
      return
    }
    const shader = style instanceof SkiaGradient ? style.toShader() : (style as SkiaPattern).shader
    this.paint.setColor(Float32Array.of(0, 0, 0, alpha))
    this.paint.setShader(shader)
  }
}
