import type { LayerFactory } from '@tank-tussle/client-core'

/** Offscreen layers for the shared painters, backed by DOM canvases. */
export const createCanvasLayer: LayerFactory = (width, height, ratio) => {
  const canvas = document.createElement('canvas')
  canvas.width = width * ratio
  canvas.height = height * ratio
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not supported')
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  return { context, image: canvas }
}
