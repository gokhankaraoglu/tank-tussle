import type { PlayerProfile } from '@tank-tussle/game-core'
import {
  ClientEvent,
  PROTOCOL_MISMATCH,
  ServerEvent,
  type Ack,
  type MatchStartedPayload,
  type ResumePayload,
  type RoomJoinedPayload,
  type RoomSettings,
  type RoomSummary,
} from '@tank-tussle/protocol'
import type { CredentialsStore } from './credentials-store.js'
import type { GameSocket } from './game-socket.js'
import { Listeners } from './listeners.js'

/** `outdated`: client and server speak different protocol versions; retrying will not help. */
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'outdated'

export type ResumeOutcome =
  | { readonly ok: true; readonly payload: ResumePayload }
  | { readonly ok: false; readonly error: string }

/**
 * One socket for the whole online visit: lobby, waiting room and match.
 * Remembers the seat token and transparently reclaims the seat after a reconnect.
 */
export class OnlineConnection {
  private status: ConnectionStatus = 'connecting'
  private hasConnected = false
  private readonly statusListeners = new Listeners<ConnectionStatus>()
  private readonly resumeListeners = new Listeners<ResumeOutcome>()
  /**
   * A match can start while the UI is still switching to the waiting room (quick matches start
   * the moment the guest sits down), before anyone listens for it. It is kept until taken.
   */
  private startedMatch: MatchStartedPayload | null = null

  constructor(
    readonly socket: GameSocket,
    private readonly credentials: CredentialsStore,
  ) {
    socket.on('connect', () => void this.handleConnect())
    socket.on('disconnect', () => this.setStatus('reconnecting'))
    socket.on('connect_error', (error) => this.handleConnectError(error))
    socket.on(ServerEvent.MatchStarted, (payload) => (this.startedMatch = payload))
    if (socket.connected) void this.handleConnect()
  }

  getStatus = (): ConnectionStatus => this.status

  onStatus = (listener: (status: ConnectionStatus) => void): (() => void) =>
    this.statusListeners.add(listener)

  /** Fires after an automatic resume following a dropped connection. */
  onResumed = (listener: (outcome: ResumeOutcome) => void): (() => void) =>
    this.resumeListeners.add(listener)

  hasSeat(): boolean {
    return this.credentials.load() !== null
  }

  listRooms(): Promise<RoomSummary[]> {
    return this.socket.emitWithAck(ClientEvent.ListRooms)
  }

  async createRoom(
    profile: PlayerProfile,
    settings: RoomSettings,
  ): Promise<Ack<RoomJoinedPayload>> {
    return this.remember(
      await this.socket.emitWithAck(ClientEvent.CreateRoom, { profile, settings }),
    )
  }

  /** The match that started since the last call, if no screen has handled it yet. */
  takeStartedMatch(): MatchStartedPayload | null {
    const payload = this.startedMatch
    this.startedMatch = null
    return payload
  }

  async joinRoom(roomId: string, profile: PlayerProfile): Promise<Ack<RoomJoinedPayload>> {
    return this.remember(await this.socket.emitWithAck(ClientEvent.JoinRoom, { roomId, profile }))
  }

  startMatch(): Promise<Ack> {
    return this.socket.emitWithAck(ClientEvent.StartMatch)
  }

  leaveRoom(): void {
    this.startedMatch = null
    this.credentials.clear()
    this.socket.emit(ClientEvent.LeaveRoom)
  }

  /** The room is gone (closed by the server); the token is useless now. */
  forgetSeat(): void {
    this.credentials.clear()
  }

  async resume(): Promise<ResumeOutcome> {
    const credentials = this.credentials.load()
    if (!credentials) return { ok: false, error: 'No game to resume' }
    const reply = await this.socket.emitWithAck(ClientEvent.Resume, { token: credentials.token })
    if (!reply.ok) {
      this.credentials.clear()
      return { ok: false, error: reply.error }
    }
    return { ok: true, payload: reply.data }
  }

  dispose(): void {
    if (this.hasSeat()) this.leaveRoom()
    this.statusListeners.clear()
    this.resumeListeners.clear()
    this.socket.removeAllListeners()
    this.socket.disconnect()
  }

  private async handleConnect(): Promise<void> {
    const reconnected = this.hasConnected
    this.hasConnected = true
    if (reconnected && this.hasSeat()) this.resumeListeners.emit(await this.resume())
    this.setStatus('connected')
  }

  private handleConnectError(error: Error): void {
    if (error.message === PROTOCOL_MISMATCH) {
      this.socket.disconnect()
      this.setStatus('outdated')
      return
    }
    this.setStatus(this.hasConnected ? 'reconnecting' : 'offline')
  }

  private remember(reply: Ack<RoomJoinedPayload>): Ack<RoomJoinedPayload> {
    if (reply.ok) this.credentials.save(reply.data.credentials)
    return reply
  }

  private setStatus(status: ConnectionStatus): void {
    if (status === this.status) return
    this.status = status
    this.statusListeners.emit(status)
  }
}
