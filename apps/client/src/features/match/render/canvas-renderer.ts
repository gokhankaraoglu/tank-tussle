import { SceneRenderer, type RenderScene } from '@tank-tussle/client-core'
import { WORLD } from '@tank-tussle/game-core'
import { createCanvasLayer } from './offscreen.js'

/** Hosts the shared SceneRenderer on a DOM canvas and keeps it crisp on high-density screens. */
export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly scene: SceneRenderer

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not supported')
    this.context = context
    const ratio = pixelRatio()
    this.scene = new SceneRenderer(createCanvasLayer, ratio)
    this.applyRatio(ratio)
  }

  /** Matches the backing store to the device pixel ratio for crisp output. */
  resize(): void {
    const ratio = pixelRatio()
    this.scene.resize(ratio)
    this.applyRatio(ratio)
  }

  render(scene: RenderScene): void {
    this.scene.render(this.context, scene)
  }

  private applyRatio(ratio: number): void {
    this.canvas.width = WORLD.width * ratio
    this.canvas.height = WORLD.height * ratio
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0)
  }
}

const pixelRatio = (): number => Math.min(window.devicePixelRatio || 1, 2)
