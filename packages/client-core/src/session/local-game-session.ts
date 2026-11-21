import {
  aimTank,
  chooseCpuPick,
  chooseCpuShot,
  createMatch,
  createRng,
  dealAllWeapons,
  fire,
  MatchRuleError,
  moveTank,
  pickWeapon,
  PLAYER_INDICES,
  randomSeed,
  type CreateMatchOptions,
  type MatchState,
  type MoveDirection,
  type PlayerIndex,
  type WeaponRegistry,
} from '@tank-tussle/game-core'
import type { GameSession, SessionSnapshot } from './game-session.js'
import type { PlayerController } from './player-controller.js'
import { browserScheduler, type Scheduler } from './scheduler.js'
import { SessionStore } from './session-store.js'

const CPU_THINKING_MS = 900

export interface LocalSessionOptions {
  readonly match: Omit<CreateMatchOptions, 'seed'>
  readonly controllers: readonly [PlayerController, PlayerController]
  readonly registry: WeaponRegistry
  readonly scheduler?: Scheduler
  readonly seedSource?: () => number
}

/** Runs the rules in the browser: hot-seat, vs CPU and practice. */
export class LocalGameSession implements GameSession {
  readonly chat = null
  private readonly store: SessionStore
  private readonly scheduler: Scheduler
  private readonly seedSource: () => number
  private readonly cpuRng = createRng(randomSeed())
  private cancelCpuTurn: (() => void) | null = null
  private shotCounter = 0

  constructor(private readonly options: LocalSessionOptions) {
    this.scheduler = options.scheduler ?? browserScheduler
    this.seedSource = options.seedSource ?? randomSeed
    this.store = new SessionStore({
      state: this.newMatch(),
      pendingShot: null,
      controllable: PLAYER_INDICES.filter((player) => options.controllers[player].kind === 'human'),
      status: 'active',
      closedMessage: null,
      presence: null,
      rematchRequestedBy: [],
      error: null,
    })
    this.runCpu()
  }

  getSnapshot = (): SessionSnapshot => this.store.get()
  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener)

  pick(poolIndex: number): void {
    this.act((state) => pickWeapon(state, state.shop.picker, poolIndex))
  }

  dealAll(): void {
    this.act(dealAllWeapons)
  }

  aim(angle: number, power: number): void {
    this.act((state) => aimTank(state, state.turn, angle, power))
  }

  move(direction: MoveDirection): void {
    this.act((state) => moveTank(state, state.turn, direction))
  }

  fire(slot: number): void {
    const { state, pendingShot } = this.store.get()
    if (pendingShot) return
    this.tryRun(() => {
      const player = state.turn
      const outcome = fire(state, player, { ...state.tanks[player], slot }, this.options.registry)
      this.store.set({
        pendingShot: {
          id: ++this.shotCounter,
          player,
          input: outcome.input,
          result: outcome.shot,
          finalState: outcome.state,
        },
        error: null,
      })
    })
  }

  completeShot(): void {
    const { pendingShot } = this.store.get()
    if (!pendingShot) return
    this.store.set({ state: pendingShot.finalState, pendingShot: null })
    this.runCpu()
  }

  rematch(): void {
    this.cancelCpu()
    this.store.set({ state: this.newMatch(), pendingShot: null, error: null })
    this.runCpu()
  }

  dispose(): void {
    this.cancelCpu()
  }

  private newMatch(): MatchState {
    return createMatch({ ...this.options.match, seed: this.seedSource() }, this.options.registry)
  }

  private act(change: (state: MatchState) => MatchState): void {
    const { state, pendingShot } = this.store.get()
    if (pendingShot) return
    this.tryRun(() => {
      this.store.set({ state: change(state), error: null })
      this.runCpu()
    })
  }

  private tryRun(action: () => void): void {
    try {
      action()
    } catch (error) {
      if (!(error instanceof MatchRuleError)) throw error
      this.store.set({ error: error.message })
    }
  }

  /** Lets CPU players pick instantly in the shop and fire after a short "thinking" delay. */
  private runCpu(): void {
    const { state, pendingShot } = this.store.get()
    if (pendingShot || this.cancelCpuTurn) return

    if (state.phase === 'shop') {
      const controller = this.options.controllers[state.shop.picker]
      if (controller.kind === 'cpu') this.pick(chooseCpuPick(state, this.options.registry))
      return
    }

    if (state.phase !== 'playing') return
    const controller = this.options.controllers[state.turn]
    if (controller.kind !== 'cpu') return

    this.cancelCpuTurn = this.scheduler.schedule(() => {
      this.cancelCpuTurn = null
      this.playCpuTurn(state.turn, controller.level)
    }, CPU_THINKING_MS)
  }

  private playCpuTurn(player: PlayerIndex, level: number): void {
    const { state } = this.store.get()
    if (state.phase !== 'playing' || state.turn !== player) return
    const shot = chooseCpuShot(state, player, level, this.options.registry, this.cpuRng)
    this.store.set({ state: aimTank(state, player, shot.angle, shot.power) })
    this.fire(shot.slot)
  }

  private cancelCpu(): void {
    this.cancelCpuTurn?.()
    this.cancelCpuTurn = null
  }
}
