import { Inject, Injectable } from '@nestjs/common'
import {
  MATCH,
  aimTank,
  createMatch,
  dealAllWeapons,
  fire,
  moveTank,
  pickWeapon,
  type FireCommand,
  type FireOutcome,
  type MatchState,
  type MoveDirection,
  type PlayerIndex,
  type PlayerProfile,
  type WeaponRegistry,
} from '@tank-tussle/game-core'
import { DomainError } from '../common/domain-error.js'
import { SEED_SOURCE, WEAPON_REGISTRY, type SeedSource } from './tokens.js'

interface MatchSession {
  state: MatchState
  readonly rematchVotes: Set<PlayerIndex>
}

export interface MatchOptions {
  readonly weaponsPerPlayer?: number
}

export interface MatchSnapshot {
  readonly state: MatchState
  readonly rematchRequestedBy: readonly PlayerIndex[]
}

export type RematchResult =
  { readonly started: true; readonly state: MatchState } | { readonly started: false }

/**
 * Owns the authoritative state of every online match.
 * All rules live in game-core; this service only stores state per room.
 */
@Injectable()
export class MatchesService {
  private readonly sessions = new Map<string, MatchSession>()

  constructor(
    @Inject(WEAPON_REGISTRY) private readonly registry: WeaponRegistry,
    @Inject(SEED_SOURCE) private readonly nextSeed: SeedSource,
  ) {}

  start(
    roomId: string,
    players: readonly [PlayerProfile, PlayerProfile],
    options: MatchOptions = {},
  ): MatchState {
    const weaponsPerPlayer = options.weaponsPerPlayer ?? MATCH.weaponsPerPlayer
    const state = createMatch(
      {
        mode: 'versus',
        players,
        seed: this.nextSeed(),
        weaponsPerPlayer,
        shopSize: weaponsPerPlayer * 2,
      },
      this.registry,
    )
    this.sessions.set(roomId, { state, rematchVotes: new Set() })
    return state
  }

  pick(roomId: string, player: PlayerIndex, poolIndex: number): MatchState {
    return this.update(roomId, (state) => pickWeapon(state, player, poolIndex))
  }

  /** Deals every remaining weapon at random to both players; the battle starts right away. */
  dealAll(roomId: string): MatchState {
    return this.update(roomId, dealAllWeapons)
  }

  aim(roomId: string, player: PlayerIndex, angle: number, power: number): MatchState {
    return this.update(roomId, (state) => aimTank(state, player, angle, power))
  }

  move(roomId: string, player: PlayerIndex, direction: MoveDirection): MatchState {
    return this.update(roomId, (state) => moveTank(state, player, direction))
  }

  fire(roomId: string, player: PlayerIndex, command: FireCommand): FireOutcome {
    const session = this.session(roomId)
    const outcome = fire(session.state, player, command, this.registry)
    session.state = outcome.state
    return outcome
  }

  /** Starts a new match once both players have asked for one. */
  requestRematch(roomId: string, player: PlayerIndex): RematchResult {
    const session = this.session(roomId)
    if (session.state.phase !== 'over') throw new DomainError('The match is still running')

    session.rematchVotes.add(player)
    if (session.rematchVotes.size < 2) return { started: false }
    const { players, weaponsPerPlayer } = session.state.config
    return { started: true, state: this.start(roomId, players, { weaponsPerPlayer }) }
  }

  /** Current state and rematch votes, or null if no match runs in the room. */
  find(roomId: string): MatchSnapshot | null {
    const session = this.sessions.get(roomId)
    return session ? { state: session.state, rematchRequestedBy: [...session.rematchVotes] } : null
  }

  end(roomId: string): void {
    this.sessions.delete(roomId)
  }

  private update(roomId: string, change: (state: MatchState) => MatchState): MatchState {
    const session = this.session(roomId)
    session.state = change(session.state)
    return session.state
  }

  private session(roomId: string): MatchSession {
    const session = this.sessions.get(roomId)
    if (!session) throw new DomainError('No match is running in this room')
    return session
  }
}
