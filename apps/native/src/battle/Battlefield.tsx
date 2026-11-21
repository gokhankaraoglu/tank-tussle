import {
  activeLocalPlayer,
  aimFromPoint,
  BattleStage,
  SceneRenderer,
  toWorldPoint,
  type SessionSnapshot,
} from '@tank-tussle/client-core'
import {
  tankPose,
  Terrain,
  WORLD,
  type PlayerIndex,
  type ShotEvent,
  type WeaponId,
} from '@tank-tussle/game-core'
import { Canvas, Group, Picture, Skia, type SkPicture } from '@shopify/react-native-skia'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native'
import { createPictureLayer } from '../platform/picture-layer'
import { SkiaCanvas2D } from '../platform/skia-canvas'
import { colors, radius, withAlpha } from '../theme'

interface BattlefieldProps {
  readonly snapshot: SessionSnapshot
  /** Local player who may aim right now (by dragging on the field), or null. */
  readonly aimingPlayer: PlayerIndex | null
  readonly onAim: (angle: number, power: number) => void
  readonly onShotFinished: () => void
  readonly onShotEvents?: (events: ShotEvent[], weaponId: WeaponId) => void
}

const WORLD_BOUNDS = Skia.XYWHRect(0, 0, WORLD.width, WORLD.height)
const ASPECT = WORLD.width / WORLD.height

/** Owns the Skia canvas and the animation loop; replays pending shots, then reports completion. */
export const Battlefield = (props: BattlefieldProps) => {
  const { snapshot, aimingPlayer, onAim } = props
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [picture, setPicture] = useState<SkPicture | null>(null)
  const dragging = useRef(false)
  /** Latest props for the animation loop, which is set up only once. */
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })

  const { state, pendingShot } = snapshot
  const terrain = useMemo(() => Terrain.fromLayers(state.terrain), [state.terrain])
  const canAim = aimingPlayer !== null && !pendingShot

  useEffect(() => {
    const renderer = new SceneRenderer(createPictureLayer, 1)
    const stage = new BattleStage(performance.now())
    let failed = false
    let frame = requestAnimationFrame(function loop() {
      const current = latest.current
      try {
        const scene = stage.frame(
          {
            snapshot: current.snapshot,
            aimingPlayer: current.aimingPlayer,
            dragging: dragging.current,
          },
          performance.now(),
          { onShotEvents: current.onShotEvents, onShotFinished: current.onShotFinished },
        )
        const recorder = Skia.PictureRecorder()
        renderer.render(new SkiaCanvas2D(recorder.beginRecording(WORLD_BOUNDS)), scene)
        setPicture(recorder.finishRecordingAsPicture())
      } catch (error) {
        // Keep animating: one bad frame must not freeze the battlefield. Report it once.
        if (!failed) console.warn('Battlefield frame failed', error)
        failed = true
      }
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout
    const fitted = Math.min(width, height * ASPECT)
    setSize({ width: fitted, height: fitted / ASPECT })
  }

  /** Points the barrel at the finger: direction = angle, distance from the turret = power. */
  const aimAt = ({ nativeEvent }: GestureResponderEvent) => {
    if (!canAim || aimingPlayer === null || size.width === 0) return
    const point = toWorldPoint(nativeEvent.locationX, nativeEvent.locationY, {
      left: 0,
      top: 0,
      ...size,
    })
    const { angle, power } = aimFromPoint(tankPose(state.tanks[aimingPlayer], terrain), point)
    onAim(angle, power)
  }

  const waiting = activeLocalPlayer(snapshot) === null && state.phase === 'playing' && !pendingShot

  return (
    <View style={styles.frame} onLayout={onLayout}>
      <View
        style={[styles.field, size]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${state.tanks[0].name} ${state.tanks[0].score} – ${state.tanks[1].score} ${state.tanks[1].name}`}
        onStartShouldSetResponder={() => canAim}
        onResponderGrant={(event) => {
          dragging.current = true
          aimAt(event)
        }}
        onResponderMove={aimAt}
        onResponderRelease={() => (dragging.current = false)}
        onResponderTerminate={() => (dragging.current = false)}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {picture && (
            <Group transform={[{ scale: size.width / WORLD.width }]}>
              <Picture picture={picture} />
            </Group>
          )}
        </Canvas>
        {waiting && <Text style={styles.banner}>{state.tanks[state.turn].name} is aiming…</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  field: {
    overflow: 'hidden',
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  banner: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: withAlpha(colors.background, 0.8),
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
})
