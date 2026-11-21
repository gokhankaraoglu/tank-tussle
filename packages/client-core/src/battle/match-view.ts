import {
  tankPose,
  Terrain,
  worldAngle,
  type MatchPhase,
  type MatchState,
  type PlayerIndex,
} from '@tank-tussle/game-core'
import type { MusicTrack } from '../audio/sound-catalog.js'
import type { Screen } from '../flow/flow.js'
import type { SessionSnapshot } from '../session/game-session.js'

/** Drafting weapons is quiet waiting; the victory tune starts once the last shot has landed. */
export const matchMusic = (phase: MatchPhase, shotInFlight: boolean): MusicTrack => {
  if (phase === 'shop') return 'waiting'
  return phase === 'over' && !shotInFlight ? 'victory' : 'battle'
}

/** The tank whose controls are shown: the local player on turn, else "you", else whoever is up. */
export const hudPlayerOf = (
  snapshot: SessionSnapshot,
  localPlayer: PlayerIndex | null,
): PlayerIndex => {
  if (localPlayer !== null) return localPlayer
  const [only] = snapshot.controllable
  return snapshot.controllable.length === 1 && only !== undefined ? only : snapshot.state.turn
}

export const statusLine = (snapshot: SessionSnapshot, yourTurn: boolean): string => {
  if (snapshot.error) return snapshot.error
  if (snapshot.pendingShot) return 'Incoming!'
  const name = snapshot.state.tanks[snapshot.state.turn].name
  return yourTurn ? `${name}, take your shot` : `${name}'s turn`
}

/** How far the hull leans and where the barrel really points, for display next to the angle. */
export const slopeInfo = (
  state: MatchState,
  player: PlayerIndex,
): { tilt: number; aims: number } => {
  const pose = tankPose(state.tanks[player], Terrain.fromLayers(state.terrain))
  return {
    tilt: Math.round(pose.tilt),
    aims: Math.round(worldAngle(pose, state.tanks[player].angle)),
  }
}

/** Headline of the game-over dialog. */
export const resultHeadline = (state: MatchState): string =>
  state.result === 'draw' ? "It's a draw!" : `${state.tanks[state.result ?? 0].name} wins!`

const WAITING_SCREENS: ReadonlySet<Screen['name']> = new Set(['room', 'resuming', 'quick-match'])

/**
 * Music outside a match: the waiting loop while looking for an opponent, the menu theme
 * otherwise. `undefined` on the match screen, which picks its own track.
 */
export const screenMusic = (screen: Screen): MusicTrack | undefined => {
  if (screen.name === 'match') return undefined
  return WAITING_SCREENS.has(screen.name) ? 'waiting' : 'menu'
}
