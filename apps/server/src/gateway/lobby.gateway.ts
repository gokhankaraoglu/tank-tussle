import { Inject } from '@nestjs/common'
import type { PlayerIndex } from '@tank-tussle/game-core'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets'
import {
  ClientEvent,
  parseCreateRoom,
  parseJoinRoom,
  parseResume,
  type Ack,
  type ResumePayload,
  type RoomJoinedPayload,
  type RoomSummary,
} from '@tank-tussle/protocol'
import { toAck } from '../common/ack.js'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'
import { GameEventLogger } from '../observability/game-event-logger.js'
import { MatchesService } from '../matches/matches.service.js'
import { ReconnectionTimers } from '../rooms/reconnection-timers.js'
import { toRoomView, type Room } from '../rooms/room.js'
import type { DepartureResult, JoinResult } from '../rooms/room-events.js'
import { RoomsService } from '../rooms/rooms.service.js'
import { RoomBroadcaster } from './room-broadcaster.js'
import type { GameServer, GameSocket } from './socket-types.js'

/** Lobby and room lifecycle: create, join, start, leave, disconnect and resume. */
@WebSocketGateway()
export class LobbyGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: GameServer
  private broadcast!: RoomBroadcaster

  constructor(
    private readonly rooms: RoomsService,
    private readonly matches: MatchesService,
    private readonly timers: ReconnectionTimers,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly events: GameEventLogger,
  ) {}

  afterInit(server: GameServer): void {
    this.broadcast = new RoomBroadcaster(server, this.rooms)
  }

  @SubscribeMessage(ClientEvent.ListRooms)
  listRooms(): RoomSummary[] {
    return this.rooms.listOpen()
  }

  @SubscribeMessage(ClientEvent.CreateRoom)
  async createRoom(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<RoomJoinedPayload>> {
    const reply = toAck(() => {
      const { profile, settings } = parseCreateRoom(body)
      return this.rooms.create(client.id, profile, settings)
    })
    if (!reply.ok) return this.rejected(ClientEvent.CreateRoom, reply)
    const { room } = reply.data
    this.events.info('room.created', {
      room: room.id,
      visibility: room.settings.visibility,
      weapons: room.settings.weaponsPerPlayer,
    })
    await client.join(room.id)
    this.broadcast.openRooms()
    return { ok: true, data: joinedPayload(reply.data) }
  }

  @SubscribeMessage(ClientEvent.JoinRoom)
  async joinRoom(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<RoomJoinedPayload>> {
    const reply = toAck(() => {
      const { roomId, profile } = parseJoinRoom(body)
      return this.rooms.join(roomId, client.id, profile)
    })
    if (!reply.ok) return this.rejected(ClientEvent.JoinRoom, reply)
    this.events.info('room.joined', { room: reply.data.room.id })
    await client.join(reply.data.room.id)
    this.broadcast.roomUpdated(reply.data.room)
    this.broadcast.openRooms()
    return { ok: true, data: joinedPayload(reply.data) }
  }

  @SubscribeMessage(ClientEvent.StartMatch)
  startMatch(@ConnectedSocket() client: GameSocket): Ack {
    const reply = toAck(() => {
      const room = this.rooms.start(client.id)
      const state = this.matches.start(room.id, [room.host.profile, room.guest.profile], {
        weaponsPerPlayer: room.settings.weaponsPerPlayer,
      })
      this.broadcast.roomUpdated(room)
      this.broadcast.matchStarted(room, state)
      this.events.info('match.started', { room: room.id, weapons: room.settings.weaponsPerPlayer })
    })
    return reply.ok ? reply : this.rejected(ClientEvent.StartMatch, reply)
  }

  @SubscribeMessage(ClientEvent.LeaveRoom)
  async leaveRoom(@ConnectedSocket() client: GameSocket): Promise<void> {
    await this.handleDeparture(this.rooms.leave(client.id), client)
  }

  @SubscribeMessage(ClientEvent.Resume)
  async resume(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<ResumePayload>> {
    const reply = toAck(() => {
      const { token } = parseResume(body)
      return { token, ...this.rooms.resume(token, client.id) }
    })
    if (!reply.ok) {
      this.events.info('seat.resume-failed', { reason: reply.error })
      return reply
    }

    const { token, room, player, previousSocketId } = reply.data
    this.timers.cancel(token)
    this.events.info('seat.resumed', { room: room.id, seat: seatName(player) })
    if (previousSocketId) this.server.in(previousSocketId).socketsLeave(room.id)
    await client.join(room.id)
    this.broadcast.roomUpdated(room)
    this.broadcast.openRooms()

    const match = this.matches.find(room.id)
    return {
      ok: true,
      data: {
        room: toRoomView(room),
        you: player,
        match: match?.state ?? null,
        rematchRequestedBy: match?.rematchRequestedBy ?? [],
      },
    }
  }

  async handleDisconnect(client: GameSocket): Promise<void> {
    const result = this.rooms.disconnect(client.id, this.config.reconnectGraceMs)
    if (result?.kind !== 'disconnected') return this.handleDeparture(result, client)

    this.events.info('seat.disconnected', {
      room: result.room.id,
      seat: seatName(result.player),
      graceMs: this.config.reconnectGraceMs,
    })
    this.timers.schedule(result.token, this.config.reconnectGraceMs, () => {
      void this.handleDeparture(this.rooms.expire(result.token))
    })
    this.broadcast.roomUpdated(result.room)
    this.broadcast.openRooms()
  }

  private async handleDeparture(
    result: DepartureResult | null,
    client?: GameSocket,
  ): Promise<void> {
    if (!result) return
    if (result.kind === 'seat-freed') {
      this.events.info('room.left', { room: result.room.id })
      await client?.leave(result.room.id)
      this.broadcast.roomUpdated(result.room)
    } else {
      this.events.info('room.closed', { room: result.room.id, reason: result.reason })
      this.closeRoom(result.room, result)
    }
    this.broadcast.openRooms()
  }

  /** Expected refusals (full room, wrong code…) are routine: logged only at debug level. */
  private rejected<T>(event: string, reply: Extract<Ack<T>, { ok: false }>): typeof reply {
    this.events.debug('request.rejected', { event, reason: reply.error })
    return reply
  }

  private closeRoom(room: Room, result: Extract<DepartureResult, { kind: 'closed' }>): void {
    this.matches.end(room.id)
    this.timers.cancel(room.host.token)
    if (room.guest) this.timers.cancel(room.guest.token)
    this.broadcast.roomClosed(room, result.notify, result.reason)
  }
}

const seatName = (player: PlayerIndex): string => (player === 0 ? 'host' : 'guest')

const joinedPayload = ({ room, player, token }: JoinResult): RoomJoinedPayload => ({
  room: toRoomView(room),
  you: player,
  credentials: { roomId: room.id, token },
})
