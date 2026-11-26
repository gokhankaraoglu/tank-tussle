import { Terrain, type TerrainLayers } from '@tank-tussle/game-core'
import {
  drawDust,
  drawExplosion,
  drawGlow,
  drawMuzzleFlash,
  drawPopup,
  drawTrail,
} from './effects-painter.js'
import type { RenderScene } from './render-scene.js'
import { SkyPainter } from './sky-painter.js'
import { drawAimGuide, drawTank } from './tank-painter.js'
import { TerrainPainter } from './terrain-painter.js'
import type { Canvas2D, LayerFactory } from './canvas-2d.js'

const STILL = { rolled: 0, bob: 0 } as const

/**
 * Draws a RenderScene onto a 2D context whose units are world pixels (the caller scales the
 * context to the screen). Knows nothing about rules, sessions or the platform it runs on.
 */
export class SceneRenderer {
  private readonly sky: SkyPainter
  private readonly terrain: TerrainPainter
  private view: Terrain | null = null
  private viewLayers: TerrainLayers | null = null

  /** `ratio`: device pixels per world pixel, for the cached layers. */
  constructor(createLayer: LayerFactory, ratio: number) {
    this.sky = new SkyPainter(ratio, createLayer)
    this.terrain = new TerrainPainter(ratio, createLayer)
  }

  resize(ratio: number): void {
    this.sky.resize(ratio)
    this.terrain.resize(ratio)
  }

  render(ctx: Canvas2D, scene: RenderScene): void {
    this.sky.draw(ctx, scene.time)
    this.terrain.draw(ctx, scene.terrain)

    const terrain = this.terrainView(scene.terrain)
    scene.tanks.forEach((tank, index) => {
      const other = scene.tanks[index === 0 ? 1 : 0]
      drawTank(ctx, tank, terrain, {
        facing: other.x >= tank.x ? 1 : -1,
        active: scene.activePlayer === index,
        recoil: scene.recoil[index] ?? 0,
        time: scene.time,
        motion: scene.motion[index] ?? STILL,
      })
    })
    if (scene.aimGuide) {
      const { player, dragging } = scene.aimGuide
      drawAimGuide(ctx, scene.tanks[player], terrain, dragging, scene.time)
    }
    scene.muzzleFlashes.forEach((flash) => drawMuzzleFlash(ctx, flash))
    scene.trails.forEach((trail) => drawTrail(ctx, trail))
    scene.projectiles.forEach((projectile) =>
      drawGlow(ctx, projectile.x, projectile.y, projectile.radius, projectile.color),
    )
    scene.dustClouds.forEach((cloud) => drawDust(ctx, cloud))
    scene.explosions.forEach((explosion) => drawExplosion(ctx, explosion))
    scene.popups.forEach((popup) => drawPopup(ctx, popup))
  }

  /** Terrain queries for the tanks; rebuilt only when the terrain changes. */
  private terrainView(layers: TerrainLayers): Terrain {
    if (layers !== this.viewLayers || !this.view) {
      this.view = Terrain.fromLayers(layers)
      this.viewLayers = layers
    }
    return this.view
  }
}
