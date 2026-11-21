import type { PlayerIndex, ShotEvent, WeaponId, WeaponRegistry } from '@tank-tussle/game-core'
import type { SessionSnapshot } from '@tank-tussle/client-core'
import type { BattleControls } from '@tank-tussle/client-core'

/** Everything a battle layout needs; the wide and compact layouts share it. */
export interface BattleViewProps {
  readonly snapshot: SessionSnapshot
  readonly registry: WeaponRegistry
  /** Tank whose controls are shown (the local player, or the one on turn). */
  readonly hudPlayer: PlayerIndex
  readonly slot: number
  /** Null while it is not this device's turn. */
  readonly controls: BattleControls | null
  /** Local player who may aim on the battlefield right now, or null. */
  readonly aimingPlayer: PlayerIndex | null
  readonly status: string
  readonly onRequestExit: () => void
  readonly onShotFinished: () => void
  readonly onShotEvents: (events: ShotEvent[], weaponId: WeaponId) => void
}
