import {
  aimTank,
  opponentOf,
  replayShot,
  type MatchState,
  type MoveDirection,
  type PlayerIndex,
  type WeaponRegistry,
} from '@tank-tussle/game-core'
import {
  ClientEvent,
  ROOM_CLOSED_MESSAGES,
  ServerEvent,
  type Ack,
  type RoomView,
  type ServerToClientEvents,
  type ShotPayload,
} from '@tank-tussle/protocol'
import type { OnlineConnection, ResumeOutcome } from '../network/online-connection.js'
import type { GameSession, OnlinePresence, SessionSnapshot } from './game-session.js'
import { throttle } from '../util/throttle.js'
import { SessionStore } from './session-store.js'

const AIM_SEND_INTERVAL_MS = 50

type QueuedUpdate =
  | { readonly kind: 'state'; readonly state: MatchState }
  | { readonly kind: 'shot'; readonly payload: ShotPayload }

export interface OnlineMatchStart {
  readonly state: MatchState
  readonly you: PlayerIndex
  readonly room: RoomView | null
  readonly rematchRequestedBy?: readonly PlayerIndex[]
}

/**
 * The server owns the rules. This session sends intents, replays shots locally for animation
 * and then adopts the authoritative state the server sent along with the shot.
 */
export class OnlineGameSession implements GameSession {
  private readonly store: SessionStore
  private readonly queue: QueuedUpdate[] = []
  private readonly unsubscribe: (() => void)[] = []
  private shotCounter = 0
  /** Dragging produces many aim updates; the opponent only needs ~20 per second. */
  private readonly sendAim = throttle(
    (angle: number, power: number) => this.socket.emit(ClientEvent.Aim, { angle, power }),
    AIM_SEND_INTERVAL_MS,
  )

  constructor(
    private readonly connection: OnlineConnection,
    start: OnlineMatchStart,
    private readonly registry: WeaponRegistry,
  ) {
    this.store = new SessionStore({
      state: start.state,
      pendingShot: null,
      controllable: [start.you],
      status: 'active',
      closedMessage: null,
      presence: presenceFrom(start.room, start.you, 'connected'),
      rematchRequestedBy: start.rematchRequestedBy ?? [],
      error: null,
    })
    this.listen()
  }

  get chat() {
    return this.connection.chat
  }

  getSnapshot = (): SessionSnapshot => this.store.get()
  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener)

  private get socket() {
    return this.connection.socket
  }

  private get you(): PlayerIndex {
    return this.store.get().controllable[0] ?? 0
  }

  pick(poolIndex: number): void {
    void this.request(this.socket.emitWithAck(ClientEvent.PickWeapon, { poolIndex }))
  }

  dealAll(): void {
    void this.request(this.socket.emitWithAck(ClientEvent.DealAll))
  }

  aim(angle: number, power: number): void {
    const { state, pendingShot } = this.store.get()
    if (pendingShot || state.phase !== 'playing') return
    const next = aimTank(state, this.you, angle, power)
    this.store.set({ state: next })
    const tank = next.tanks[this.you]
    this.sendAim(tank.angle, tank.power)
  }

  move(direction: MoveDirection): void {
    void this.request(this.socket.emitWithAck(ClientEvent.Move, { direction }))
  }

  fire(slot: number): void {
    this.sendAim.cancel()
    const tank = this.store.get().state.tanks[this.you]
    void this.request(
      this.socket.emitWithAck(ClientEvent.Fire, { angle: tank.angle, power: tank.power, slot }),
    )
  }

  completeShot(): void {
    const { pendingShot } = this.store.get()
    if (!pendingShot) return
    this.store.set({ state: pendingShot.finalState, pendingShot: null })
    this.drainQueue()
  }

  rematch(): void {
    this.socket.emit(ClientEvent.Rematch)
  }

  dispose(): void {
    this.sendAim.cancel()
    this.unsubscribe.forEach((stop) => stop())
    this.connection.dispose()
  }

  private listen(): void {
    const on = this.on.bind(this)
    on(ServerEvent.MatchState, ({ state }) => this.enqueue({ kind: 'state', state }))
    on(ServerEvent.Shot, (payload) => this.enqueue({ kind: 'shot', payload }))
    on(ServerEvent.Aimed, ({ player, angle, power }) => {
      const { state, pendingShot } = this.store.get()
      if (pendingShot || this.queue.length > 0 || state.phase !== 'playing') return
      this.store.set({ state: aimTank(state, player, angle, power) })
    })
    on(ServerEvent.MatchStarted, ({ state, you }) => {
      this.queue.length = 0
      this.store.set({
        state,
        controllable: [you],
        pendingShot: null,
        rematchRequestedBy: [],
        error: null,
      })
    })
    on(ServerEvent.RematchRequested, ({ player }) => {
      const requested = this.store.get().rematchRequestedBy
      if (!requested.includes(player))
        this.store.set({ rematchRequestedBy: [...requested, player] })
    })
    on(ServerEvent.RoomUpdated, ({ room }) =>
      this.store.set({ presence: presenceFrom(room, this.you, this.selfStatus()) }),
    )
    on(ServerEvent.RoomClosed, ({ reason }) => {
      this.connection.forgetSeat()
      this.store.set({ status: 'closed', closedMessage: ROOM_CLOSED_MESSAGES[reason] })
    })

    this.unsubscribe.push(
      this.connection.onStatus(() => {
        const presence = this.store.get().presence
        if (presence) this.store.set({ presence: { ...presence, self: this.selfStatus() } })
      }),
      this.connection.onResumed((outcome) => this.handleResume(outcome)),
    )
  }

  /** Subscribes to a server event and remembers how to unsubscribe on dispose. */
  private on<E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E],
  ): void {
    // socket.io's overloads cannot be resolved for a generic event name; the signature above is exact.
    this.socket.on(event, listener as never)
    this.unsubscribe.push(() => this.socket.off(event, listener as never))
  }

  private selfStatus(): OnlinePresence['self'] {
    return this.connection.getStatus() === 'connected' ? 'connected' : 'reconnecting'
  }

  /** After a dropped connection the server's snapshot replaces whatever we had. */
  private handleResume(outcome: ResumeOutcome): void {
    if (!outcome.ok) {
      this.store.set({ status: 'closed', closedMessage: outcome.error })
      return
    }
    const { match, room, you, rematchRequestedBy } = outcome.payload
    this.queue.length = 0
    this.store.set({
      ...(match ? { state: match } : {}),
      pendingShot: null,
      controllable: [you],
      rematchRequestedBy,
      presence: presenceFrom(room, you, 'connected'),
    })
  }

  private enqueue(update: QueuedUpdate): void {
    this.queue.push(update)
    this.drainQueue()
  }

  /** Applies queued updates in order, pausing at each shot until its animation completes. */
  private drainQueue(): void {
    while (!this.store.get().pendingShot) {
      const update = this.queue.shift()
      if (!update) return
      if (update.kind === 'state') this.store.set({ state: update.state })
      else this.startShot(update.payload)
    }
  }

  private startShot({ player, input, state: finalState }: ShotPayload): void {
    const result = replayShot(this.store.get().state, player, input, this.registry)
    this.store.set({ pendingShot: { id: ++this.shotCounter, player, input, result, finalState } })
  }

  private async request(reply: Promise<Ack>): Promise<void> {
    const ack = await reply
    this.store.set({ error: ack.ok ? null : ack.error })
  }
}

const presenceFrom = (
  room: RoomView | null,
  you: PlayerIndex,
  self: OnlinePresence['self'],
): OnlinePresence => {
  const opponent = room ? (opponentOf(you) === 0 ? room.host : room.guest) : null
  return {
    self,
    opponentConnected: opponent?.connected ?? true,
    opponentDeadline: opponent?.reconnectDeadline ?? null,
  }
}
