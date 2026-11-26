import {
  activeLocalPlayer,
  createBattleControls,
  hudPlayerOf,
  matchKindOf,
  matchMusic,
  moveBlocks,
  slopeInfo,
  statusLine,
  useSessionSnapshot,
  type GameSession,
} from '@tank-tussle/client-core'
import { AIM, type MatchState, type PlayerIndex, type WeaponId } from '@tank-tussle/game-core'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDependencies } from '../app/dependencies'
import { useMusic, useShotSounds } from '../app/hooks'
import { colors, radius, space } from '../theme'
import { Button } from '../ui/Button'
import { SoundToggles } from '../ui/SoundToggles'
import { ChatPanel } from '../chat/ChatPanel'
import { Battlefield } from './Battlefield'
import { AimStepper, MoveControl, PlayerCard } from './controls'
import { MatchOverlays } from './MatchOverlays'
import { WeaponPicker } from './WeaponPicker'
import { WeaponShop } from './WeaponShop'

interface MatchScreenProps {
  readonly session: GameSession
  readonly onExit: () => void
}

/** Shows the shop or the battle depending on the match phase. */
export const MatchScreen = ({ session, onExit }: MatchScreenProps) => {
  const { registry, adBreaks } = useDependencies()
  const snapshot = useSessionSnapshot(session)
  const [confirmingExit, setConfirmingExit] = useState(false)
  const { state } = snapshot
  const localPlayer = activeLocalPlayer(snapshot)
  const inBattle = state.phase !== 'shop'
  const hudPlayer = hudPlayerOf(snapshot, localPlayer)
  const { slot, selectSlot } = useChosenWeapon(state, hudPlayer)
  const controls =
    inBattle && localPlayer !== null && !confirmingExit
      ? createBattleControls(session, state, localPlayer, slot, selectSlot)
      : null

  useMusic(matchMusic(state.phase, snapshot.pendingShot !== null))
  const playShotSounds = useShotSounds()

  /** Leaving a finished match is the one place an ad may appear; the action runs after it. */
  const afterAdBreak = (action: () => void) => () => {
    if (state.phase !== 'over') return action()
    void adBreaks.afterMatch(matchKindOf(snapshot)).then(action)
  }
  const tank = state.tanks[hudPlayer]
  const disabled = controls === null

  return (
    <View style={styles.root}>
      {inBattle ? (
        <SafeAreaView style={styles.battle}>
          <View style={styles.topBar}>
            <PlayerCard state={state} player={0} />
            <WeaponPicker
              state={state}
              player={hudPlayer}
              registry={registry}
              slot={slot}
              disabled={disabled}
              onSelect={(next) => controls?.selectWeapon(next)}
            />
            <Text style={styles.status} numberOfLines={1} accessibilityLiveRegion="polite">
              {statusLine(snapshot, localPlayer !== null)}
            </Text>
            <SoundToggles />
            <Button variant="ghost" onPress={() => setConfirmingExit(true)} style={styles.exit}>
              Exit
            </Button>
            <PlayerCard state={state} player={1} />
          </View>

          <View style={styles.stage}>
            <View style={styles.side}>
              <AimStepper
                label="Angle"
                hint={`aims ${slopeInfo(state, hudPlayer).aims}°`}
                value={tank.angle}
                min={AIM.minElevation}
                max={AIM.maxElevation}
                unit="°"
                disabled={disabled}
                onChange={(angle) => controls?.setAngle(angle)}
              />
              <MoveControl
                movesLeft={tank.movesLeft}
                disabled={disabled}
                blocked={moveBlocks(state, hudPlayer)}
                onMove={(direction) => controls?.move(direction)}
              />
            </View>
            <Battlefield
              snapshot={snapshot}
              aimingPlayer={controls ? localPlayer : null}
              onAim={(angle, power) => controls?.setAim(angle, power)}
              onShotFinished={() => session.completeShot()}
              onShotEvents={playShotSounds}
            />
            <View style={styles.side}>
              <AimStepper
                label="Power"
                value={tank.power}
                min={AIM.minPower}
                max={AIM.maxPower}
                disabled={disabled}
                onChange={(power) => controls?.setPower(power)}
              />
              <Button
                variant="primary"
                disabled={disabled || state.inventories[hudPlayer].length === 0}
                onPress={() => controls?.fire()}
                style={styles.fire}
              >
                FIRE
              </Button>
            </View>
          </View>
        </SafeAreaView>
      ) : (
        <WeaponShop
          state={state}
          registry={registry}
          canPick={localPlayer !== null}
          onPick={(index) => session.pick(index)}
          onDealAll={() => session.dealAll()}
          onLeave={() => setConfirmingExit(true)}
        />
      )}

      {session.chat && <ChatPanel chat={session.chat} players={[state.tanks[0], state.tanks[1]]} />}

      <MatchOverlays
        snapshot={snapshot}
        confirmingExit={confirmingExit}
        onCancelExit={() => setConfirmingExit(false)}
        onRematch={afterAdBreak(() => session.rematch())}
        onExit={afterAdBreak(onExit)}
      />
    </View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  battle: { flex: 1, padding: space.xs, gap: space.xs },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  status: { flex: 1, color: colors.muted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  exit: { minHeight: 36, paddingHorizontal: space.md },
  stage: { flex: 1, flexDirection: 'row', gap: space.sm },
  side: {
    width: 104,
    justifyContent: 'space-between',
    padding: space.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  fire: { minHeight: 56 },
})
