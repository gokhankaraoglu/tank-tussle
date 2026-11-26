/**
 * The part of the HTML Canvas 2D API the painters use. A browser `CanvasRenderingContext2D`
 * satisfies it as is; other platforms (React Native + Skia) provide an adapter, so the
 * battlefield is drawn by the same code everywhere.
 */
export interface Canvas2D {
  fillStyle: CanvasPaint
  strokeStyle: CanvasPaint
  lineWidth: number
  lineCap: 'butt' | 'round' | 'square'
  lineDashOffset: number
  globalAlpha: number
  font: string
  textAlign: 'start' | 'end' | 'left' | 'right' | 'center'

  save(): void
  restore(): void
  translate(x: number, y: number): void
  rotate(radians: number): void
  scale(x: number, y: number): void

  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  arc(x: number, y: number, radius: number, start: number, end: number): void
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    start: number,
    end: number,
  ): void
  roundRect(x: number, y: number, width: number, height: number, radius: number): void
  fill(): void
  stroke(): void
  clip(): void
  setLineDash(segments: number[]): void

  fillRect(x: number, y: number, width: number, height: number): void
  clearRect(x: number, y: number, width: number, height: number): void
  fillText(text: string, x: number, y: number): void
  measureText(text: string): { readonly width: number }
  drawImage(image: LayerImage, x: number, y: number, width: number, height: number): void

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradientLike
  createPattern(image: LayerImage, repetition: 'repeat'): object | null
}

export interface CanvasGradientLike {
  addColorStop(offset: number, color: string): void
}

/** A CSS colour, or a gradient / pattern created by the same context. */
export type CanvasPaint = string | object

/** Something a context can draw with `drawImage`: the platform's offscreen canvas. */
export type LayerImage = object

/** An offscreen drawing surface, used to cache parts of the picture that rarely change. */
export interface Layer {
  readonly context: Canvas2D
  readonly image: LayerImage
}

/**
 * Creates a layer of `width × height` drawing units, backed by `ratio` times as many pixels.
 * The returned context is already scaled, so painters always work in drawing units.
 */
export type LayerFactory = (width: number, height: number, ratio: number) => Layer
