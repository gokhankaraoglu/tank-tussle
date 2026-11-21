import {
  tankPose,
  Terrain,
  WORLD,
  type PlayerIndex,
  type ShotEvent,
  type WeaponId,
} from '@tank-tussle/game-core'
import { useEffect, useEffectEvent, useMemo, useRef, type PointerEvent } from 'react'
import { CanvasRenderer } from '../render/canvas-renderer.js'
import {
  activeLocalPlayer,
  aimFromPoint,
  BattleStage,
  toWorldPoint,
  type RenderScene,
  type SessionSnapshot,
} from '@tank-tussle/client-core'
import styles from './battle.module.css'

interface BattlefieldProps {
  readonly snapshot: SessionSnapshot
  /** Local player who may aim right now (drag or wheel on the field), or null. */
  readonly aimingPlayer: PlayerIndex | null
  readonly onAim: (angle: number, power: number) => void
  readonly onShotFinished: () => void
  /** Called once for each batch of shot events as playback reaches them. */
  readonly onShotEvents?: (events: ShotEvent[], weaponId: WeaponId) => void
}

/** Owns the canvas and the animation loop; replays pending shots, then reports completion. */
export const Battlefield = ({
  snapshot,
  aimingPlayer,
  onAim,
  onShotFinished,
  onShotEvents,
}: BattlefieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef(false)
  const { pendingShot, state } = snapshot
  const terrain = useMemo(() => Terrain.fromLayers(state.terrain), [state.terrain])
  const canAim = aimingPlayer !== null && !pendingShot

  /** Points the barrel at the pointer: direction = angle, distance from the turret = power. */
  const aimAt = (event: PointerEvent<HTMLCanvasElement>) => {
    if (aimingPlayer === null) return
    const point = toWorldPoint(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    )
    const { angle, power } = aimFromPoint(tankPose(state.tanks[aimingPlayer], terrain), point)
    onAim(angle, power)
  }

  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (!canAim || aimingPlayer === null) return
    event.preventDefault()
    const tank = state.tanks[aimingPlayer]
    const step = (event.altKey ? 0.1 : 1) * Math.sign(event.deltaY || event.deltaX) * -1
    if (event.shiftKey) onAim(tank.angle, tank.power + step)
    else onAim(tank.angle + step, tank.power)
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Non-passive so the page does not scroll while adjusting the aim.
    const listener = (event: WheelEvent) => onWheel(event)
    canvas.addEventListener('wheel', listener, { passive: false })
    return () => canvas.removeEventListener('wheel', listener)
  }, [])

  /** Latest props for the animation loop, which is set up only once. */
  const frameAt = useEffectEvent((stage: BattleStage, now: number): RenderScene =>
    stage.frame({ snapshot, aimingPlayer, dragging: draggingRef.current }, now, {
      onShotEvents,
      onShotFinished,
    }),
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new CanvasRenderer(canvas)
    const stage = new BattleStage(performance.now())
    let reported = false
    let frame = requestAnimationFrame(function loop(now) {
      try {
        renderer.render(frameAt(stage, now))
      } catch (error) {
        // Keep animating: one bad frame must not freeze the battlefield. Report it once.
        if (!reported) reportError(error)
        reported = true
      }
      frame = requestAnimationFrame(loop)
    })
    const onResize = () => renderer.resize()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const waiting = activeLocalPlayer(snapshot) === null && state.phase === 'playing' && !pendingShot

  return (
    <div className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={WORLD.width}
        height={WORLD.height}
        data-aiming={canAim}
        role="img"
        aria-label={`${state.tanks[0].name} ${state.tanks[0].score} – ${state.tanks[1].score} ${state.tanks[1].name}`}
        onPointerDown={(event) => {
          if (!canAim || event.button !== 0) return
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // Unknown pointer: dragging still works while the pointer stays on the canvas.
          }
          draggingRef.current = true
          aimAt(event)
        }}
        onPointerMove={(event) => draggingRef.current && canAim && aimAt(event)}
        onPointerUp={() => (draggingRef.current = false)}
        onPointerCancel={() => (draggingRef.current = false)}
      />
      {waiting && <div className={styles.banner}>{state.tanks[state.turn].name} is aiming…</div>}
    </div>
  )
}
