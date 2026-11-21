import { Logger } from '@nestjs/common'
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
import { RoomsService } from '../rooms/rooms.service.js'
import { RoomBroadcaster } from './room-broadcaster.js'
import type { GameServer, GameSocket } from './socket-types.js'

/** In-match intents. Validates, delegates to MatchesService, broadcasts the result. */
@WebSocketGateway()
export class MatchGateway implements OnGatewayInit {
  private readonly logger = new Logger(MatchGateway.name)

  @WebSocketServer()
  private readonly server!: GameServer
  private broadcast!: RoomBroadcaster

  constructor(
    private readonly rooms: RoomsService,
    private readonly matches: MatchesService,
  ) {}

  afterInit(server: GameServer): void {
    this.broadcast = new RoomBroadcaster(server, this.rooms)
  }

  @SubscribeMessage(ClientEvent.PickWeapon)
  pickWeapon(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack {
    return toAck(() => {
      const { poolIndex } = parsePickWeapon(body)
      const { room, player } = this.rooms.seatOf(client.id)
      this.broadcastState(room.id, this.matches.pick(room.id, player, poolIndex))
    })
  }

  @SubscribeMessage(ClientEvent.DealAll)
  dealAll(@ConnectedSocket() client: GameSocket): Ack {
    return toAck(() => {
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
    return toAck(() => {
      const { direction } = parseMove(body)
      const { room, player } = this.rooms.seatOf(client.id)
      this.broadcastState(room.id, this.matches.move(room.id, player, direction))
    })
  }

  @SubscribeMessage(ClientEvent.Fire)
  fire(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack {
    return toAck(() => {
      const command = parseFire(body)
      const { room, player } = this.rooms.seatOf(client.id)
      const { input, state } = this.matches.fire(room.id, player, command)
      this.server.to(room.id).emit(ServerEvent.Shot, { player, input, state })
    })
  }

  @SubscribeMessage(ClientEvent.Rematch)
  rematch(@ConnectedSocket() client: GameSocket): void {
    const reply = toAck(() => {
      const { room, player } = this.rooms.seatOf(client.id)
      const result = this.matches.requestRematch(room.id, player)
      if (result.started) this.broadcast.matchStarted(room, result.state)
      else this.server.to(room.id).emit(ServerEvent.RematchRequested, { player })
    })
    if (!reply.ok) this.logger.debug(`Rematch ignored: ${reply.error}`)
  }

  private broadcastState(roomId: string, state: MatchState): void {
    this.server.to(roomId).emit(ServerEvent.MatchState, { state })
  }
}
