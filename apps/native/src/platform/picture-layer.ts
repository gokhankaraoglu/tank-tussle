import type { Canvas2D, LayerFactory } from '@tank-tussle/client-core'
import { Skia, type SkPicture } from '@shopify/react-native-skia'
import { SkiaCanvas2D, type PictureSource } from './skia-canvas'

/**
 * An offscreen layer recorded as a Skia picture. Pictures are resolution independent and can be
 * replayed on any thread's GPU context, unlike offscreen surfaces.
 */
export class PictureLayer implements PictureSource {
  private recorder = Skia.PictureRecorder()
  private picture: SkPicture | null = null
  private current: SkiaCanvas2D
  /** Stable handle for painters; it always draws into the layer's current recording. */
  readonly context: Canvas2D

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.current = this.begin(null)
    this.context = new Proxy({} as Canvas2D, {
      get: (_, property) => {
        if (property === 'clearRect') return () => void (this.current = this.begin(null))
        const target = this.writable()
        const value = Reflect.get(target, property) as unknown
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value
      },
      set: (_, property, value) => Reflect.set(this.writable(), property, value),
    })
  }

  /** The layer's contents so far. Drawing again afterwards continues on top of them. */
  snapshot(): SkPicture {
    this.picture ??= this.recorder.finishRecordingAsPicture()
    return this.picture
  }

  private writable(): SkiaCanvas2D {
    if (this.picture) this.current = this.begin(this.picture)
    return this.current
  }

  private begin(base: SkPicture | null): SkiaCanvas2D {
    this.recorder = Skia.PictureRecorder()
    this.picture = null
    const canvas = this.recorder.beginRecording(Skia.XYWHRect(0, 0, this.width, this.height))
    if (base) canvas.drawPicture(base)
    return new SkiaCanvas2D(canvas)
  }
}

/** Layers for the shared painters. The pixel ratio is irrelevant: pictures are vectors. */
export const createPictureLayer: LayerFactory = (width, height) => {
  const layer = new PictureLayer(width, height)
  return { context: layer.context, image: layer }
}
