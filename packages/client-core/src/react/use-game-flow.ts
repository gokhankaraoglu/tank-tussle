import type { PlayerIndex, PlayerProfile, WeaponRegistry } from '@tank-tussle/game-core'
import type { RoomView } from '@tank-tussle/protocol'
import { useCallback, useEffect, useReducer } from 'react'
import { flowReducer, ownedConnection, type Screen } from '../flow/flow.js'
import type { GameMode, MatchSetup } from '../flow/match-setup.js'
import { createLocalSession } from '../flow/session-factory.js'
import { cpuMatchSetup, trackLadderMatch, type LadderStore } from '../ladder/ladder.js'
import type { OnlineConnection } from '../network/online-connection.js'
import type { ProfileStore } from '../profile/profile-store.js'
import type { GameSession } from '../session/game-session.js'

export interface FlowServices {
  readonly registry: WeaponRegistry
  readonly openConnection: () => OnlineConnection
  readonly profile: ProfileStore
  readonly ladder: LadderStore
}

const PRACTICE_TARGET: PlayerProfile = { name: 'Target', color: '#9aa3d6' }

/**
 * Everything that moves the player between screens, shared by the web and the native app:
 * each platform only maps `screen` to its own components and wires these actions to buttons.
 */
export const useGameFlow = (services: FlowServices, firstScreen: Screen) => {
  const { registry, openConnection, profile, ladder } = services
  const [screen, dispatch] = useReducer(flowReducer, firstScreen)
  const session = screen.name === 'match' ? screen.session : null
  const ladderLevel = screen.name === 'match' ? screen.ladderLevel : undefined

  useEffect(() => () => session?.dispose(), [session])
  useEffect(() => {
    if (!session || ladderLevel === undefined) return
    return trackLadderMatch(session, ladderLevel, ladder)
  }, [session, ladderLevel, ladder])

  const backToMenu = useCallback(() => {
    ownedConnection(screen)?.dispose()
    dispatch({ type: 'back-to-menu' })
  }, [screen])

  const startMatch = useCallback(
    (next: GameSession) => dispatch({ type: 'start-match', session: next }),
    [],
  )

  /** A match against the computer that counts for the ladder. */
  const challenge = useCallback(
    (level: number) =>
      dispatch({
        type: 'start-match',
        session: createLocalSession(cpuMatchSetup(profile.get(), level), registry),
        ladderLevel: level,
      }),
    [profile, registry],
  )

  /** Quick match found nobody (or no server): play the next ladder opponent instead. */
  const playComputer = useCallback(() => {
    ownedConnection(screen)?.dispose()
    challenge(ladder.nextLevel())
  }, [screen, challenge, ladder])

  const enterRoom = useCallback(
    (room: RoomView, you: PlayerIndex) => dispatch({ type: 'enter-room', room, you }),
    [],
  )
  const enterQuickRoom = useCallback(
    (room: RoomView, you: PlayerIndex) => dispatch({ type: 'enter-room', room, you, quick: true }),
    [],
  )
  const backToOnline = useCallback(() => dispatch({ type: 'back-to-online' }), [])

  return {
    screen,
    backToMenu,
    startMatch,
    challenge,
    playComputer,
    enterRoom,
    enterQuickRoom,
    backToOnline,
    open: (target: 'ladder' | 'friend' | 'profile') => dispatch({ type: 'open', screen: target }),
    chooseMode: (mode: GameMode) => dispatch({ type: 'choose-mode', mode }),
    openCreateRoom: () => dispatch({ type: 'open-create-room' }),
    /** One tap: look for an opponent online. */
    play: () => dispatch({ type: 'start-quick-match', connection: openConnection() }),
    practice: () =>
      startMatch(
        createLocalSession(
          { mode: 'practice', players: [profile.get(), PRACTICE_TARGET], cpuLevel: 1 },
          registry,
        ),
      ),
    /** Straight to the online hub with the remembered profile. */
    playOnline: (joinCode?: string) =>
      dispatch({
        type: 'enter-online',
        connection: openConnection(),
        profile: profile.get(),
        joinCode,
      }),
    submitSetup: (setup: MatchSetup) => {
      if (setup.mode !== 'online') return startMatch(createLocalSession(setup, registry))
      dispatch({
        type: 'enter-online',
        connection: openConnection(),
        profile: setup.players[0],
        joinCode: screen.name === 'setup' ? screen.joinCode : undefined,
      })
    },
    /** Leaving a waiting room: quick-match rooms go back to the menu, others to the hub. */
    leaveRoom: screen.name === 'room' && screen.quick ? backToMenu : backToOnline,
    /** Leaving a match: ladder matches return to the ladder. */
    exitMatch: () =>
      ladderLevel === undefined ? backToMenu() : dispatch({ type: 'open', screen: 'ladder' }),
    saveProfile: (next: PlayerProfile) => {
      profile.save(next)
      dispatch({ type: 'back-to-menu' })
    },
  }
}
