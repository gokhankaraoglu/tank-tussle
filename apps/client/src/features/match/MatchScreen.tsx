import type { MatchState, PlayerIndex, WeaponId } from '@tank-tussle/game-core'
import { useState } from 'react'
import { useDependencies } from '../../app/dependencies.js'
import { useMusic } from '../../audio/use-audio.js'
import { useShotSounds } from '../../audio/use-shot-sounds.js'
import { activeLocalPlayer, type GameSession } from '@tank-tussle/client-core'
import { useKeyBindings } from '../../shared/use-key-bindings.js'
import { PHONE_SCREEN, useMediaQuery } from '../../shared/use-media-query.js'
import { useSessionSnapshot } from '@tank-tussle/client-core'
import type { BattleViewProps } from './battle/battle-view.js'
import { CompactBattle } from './battle/CompactBattle.js'
import { MatchOverlays } from './battle/MatchOverlays.js'
import {
  createBattleControls,
  hudPlayerOf,
  matchKindOf,
  matchMusic,
  statusLine,
} from '@tank-tussle/client-core'
import { useBattleKeys } from './battle/use-battle-controls.js'
import { WideBattle } from './battle/WideBattle.js'
import { WeaponShop } from './shop/WeaponShop.js'

interface MatchScreenProps {
  readonly session: GameSession
  readonly onExit: () => void
}

/** Shows the shop or the battle depending on the match phase. */
export const MatchScreen = ({ session, onExit }: MatchScreenProps) => {
  const { registry, adBreaks } = useDependencies()
  const snapshot = useSessionSnapshot(session)
  const [confirmingExit, setConfirmingExit] = useState(false)
  const compact = useMediaQuery(PHONE_SCREEN)
  const { state } = snapshot
  const localPlayer = activeLocalPlayer(snapshot)

  const inBattle = state.phase !== 'shop'
  const hudPlayer = hudPlayerOf(snapshot, localPlayer)
  const { slot, selectSlot } = useChosenWeapon(state, hudPlayer)
  const controls =
    inBattle && localPlayer !== null && !confirmingExit
      ? createBattleControls(session, state, localPlayer, slot, selectSlot)
      : null

  useKeyBindings({ Escape: () => setConfirmingExit((open) => !open) })
  useBattleKeys(controls)
  useMusic(matchMusic(state.phase, snapshot.pendingShot !== null))
  const playShotSounds = useShotSounds()

  /** Leaving a finished match is the one place an ad may appear; the action runs after it. */
  const afterAdBreak = (action: () => void) => () => {
    if (state.phase !== 'over') return action()
    void adBreaks.afterMatch(matchKindOf(snapshot)).then(action)
  }

  const battle: BattleViewProps = {
    snapshot,
    registry,
    hudPlayer,
    slot,
    controls,
    aimingPlayer: controls ? localPlayer : null,
    status: statusLine(snapshot, localPlayer !== null),
    onRequestExit: () => setConfirmingExit(true),
    onShotFinished: () => session.completeShot(),
    onShotEvents: playShotSounds,
  }
  const Battle = compact ? CompactBattle : WideBattle

  return (
    <>
      {inBattle ? (
        <Battle {...battle} />
      ) : (
        <WeaponShop
          state={state}
          registry={registry}
          canPick={localPlayer !== null}
          onPick={(index) => session.pick(index)}
          onDealAll={() => session.dealAll()}
        />
      )}

      <MatchOverlays
        snapshot={snapshot}
        confirmingExit={confirmingExit}
        onCancelExit={() => setConfirmingExit(false)}
        onRematch={afterAdBreak(() => session.rematch())}
        onExit={afterAdBreak(onExit)}
      />
    </>
  )
}

/** Remembers each player's chosen weapon by id, not by slot: slots shift as weapons are fired. */
const useChosenWeapon = (state: MatchState, player: PlayerIndex) => {
  const [chosen, setChosen] = useState<[WeaponId | null, WeaponId | null]>([null, null])
  const inventory = state.inventories[player]
  return {
    slot: Math.max(0, inventory.indexOf(chosen[player] ?? '')),
    selectSlot: (next: number) => {
      const id = inventory[next] ?? null
      setChosen((current) => (player === 0 ? [id, current[1]] : [current[0], id]))
    },
  }
}
