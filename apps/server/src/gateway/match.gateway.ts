import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayInit,
} from '@nestjs/websockets'
import type { MatchState } from '@tank-tussle/game-core'
import {
  ClientEvent,
  parseAim,
  parseFire,
  parseMove,
  parsePickWeapon,
  ServerEvent,
  type Ack,
} from '@tank-tussle/protocol'
import { isExpectedError, toAck } from '../common/ack.js'
import { DomainError } from '../common/domain-error.js'
import { MatchesService } from '../matches/matches.service.js'
import { GameEventLogger } from '../observability/game-event-logger.js'
import { RoomsService } from '../rooms/rooms.service.js'
import { RoomBroadcaster } from './room-broadcaster.js'
import type { GameServer, GameSocket } from './socket-types.js'

/** In-match intents. Validates, delegates to MatchesService, broadcasts the result. */
@WebSocketGateway()
export class MatchGateway implements OnGatewayInit {
  @WebSocketServer()
  private readonly server!: GameServer
  private broadcast!: RoomBroadcaster

  constructor(
    private readonly rooms: RoomsService,
    private readonly matches: MatchesService,
    private readonly events: GameEventLogger,
  ) {}

  afterInit(server: GameServer): void {
    this.broadcast = new RoomBroadcaster(server, this.rooms)
  }

  @SubscribeMessage(ClientEvent.PickWeapon)
  pickWeapon(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack {
    return this.respond(ClientEvent.PickWeapon, () => {
      const { poolIndex } = parsePickWeapon(body)
      const { room, player } = this.rooms.seatOf(client.id)
      this.broadcastState(room.id, this.matches.pick(room.id, player, poolIndex))
    })
  }

  @SubscribeMessage(ClientEvent.DealAll)
  dealAll(@ConnectedSocket() client: GameSocket): Ack {
    return this.respond(ClientEvent.DealAll, () => {
      const { room, player } = this.rooms.seatOf(client.id)
      const state = this.matches.find(room.id)?.state
      if (state?.phase === 'shop' && state.shop.picker !== player) {
        throw new DomainError('Wait for your pick to deal the weapons')
      }
      this.broadcastState(room.id, this.matches.dealAll(room.id))
    })
  }

  @SubscribeMessage(ClientEvent.Aim)
  aim(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): void {
    try {
      const { angle, power } = parseAim(body)
      const { room, player } = this.rooms.seatOf(client.id)
      const tank = this.matches.aim(room.id, player, angle, power).tanks[player]
      client.to(room.id).emit(ServerEvent.Aimed, { player, angle: tank.angle, power: tank.power })
    } catch (error) {
      // Aim updates are fire-and-forget; stale ones (e.g. after the match ended) are expected.
      if (!isExpectedError(error)) throw error
    }
  }

  @SubscribeMessage(ClientEvent.Move)
  move(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack {
    return this.respond(ClientEvent.Move, () => {
      const { direction } = parseMove(body)
      const { room, player } = this.rooms.seatOf(client.id)
      this.broadcastState(room.id, this.matches.move(room.id, player, direction))
    })
  }

  @SubscribeMessage(ClientEvent.Fire)
  fire(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack {
    return this.respond(ClientEvent.Fire, () => {
      const command = parseFire(body)
      const { room, player } = this.rooms.seatOf(client.id)
      const { input, state } = this.matches.fire(room.id, player, command)
      this.server.to(room.id).emit(ServerEvent.Shot, { player, input, state })
      if (state.phase === 'over') this.events.info('match.ended', matchEndFields(room.id, state))
    })
  }

  @SubscribeMessage(ClientEvent.Rematch)
  rematch(@ConnectedSocket() client: GameSocket): void {
    const reply = toAck(() => {
      const { room, player } = this.rooms.seatOf(client.id)
      const result = this.matches.requestRematch(room.id, player)
      if (result.started) {
        this.broadcast.matchStarted(room, result.state)
        this.events.info('match.rematch', { room: room.id })
      } else {
        this.server.to(room.id).emit(ServerEvent.RematchRequested, { player })
      }
    })
    if (!reply.ok) this.events.debug('request.rejected', { event: 'rematch', reason: reply.error })
  }

  /** Runs a request; refusals (not your turn, wrong phase…) are routine and logged at debug. */
  private respond(event: string, run: () => void): Ack {
    const reply = toAck(run)
    if (!reply.ok) this.events.debug('request.rejected', { event, reason: reply.error })
    return reply
  }

  private broadcastState(roomId: string, state: MatchState): void {
    this.server.to(roomId).emit(ServerEvent.MatchState, { state })
  }
}

const RESULT_NAMES = { 0: 'host', 1: 'guest', draw: 'draw' } as const

const matchEndFields = (roomId: string, state: MatchState) => ({
  room: roomId,
  result: state.result === null ? null : RESULT_NAMES[state.result],
  score: `${state.tanks[0].score}-${state.tanks[1].score}`,
})
