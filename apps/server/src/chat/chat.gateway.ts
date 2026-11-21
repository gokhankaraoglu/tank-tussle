import { randomUUID } from 'node:crypto'
import { Inject } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayDisconnect,
} from '@nestjs/websockets'
import {
  ClientEvent,
  parseChatReport,
  parseChatSend,
  ServerEvent,
  type Ack,
} from '@tank-tussle/protocol'
import { toAck } from '../common/ack.js'
import { DomainError } from '../common/domain-error.js'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'
import type { GameServer, GameSocket } from '../gateway/socket-types.js'
import { GameEventLogger } from '../observability/game-event-logger.js'
import { TokenBucket } from '../protection/token-bucket.js'
import { RoomsService } from '../rooms/rooms.service.js'
import { ChatHistory } from './chat-history.js'
import { maskProfanity } from './profanity.js'

/** Chat is far slower than gameplay: a short burst, then one message every two seconds. */
const CHAT_RATE = { burst: 4, perSecond: 0.5 } as const
export const CHAT_TOO_FAST = 'You are sending messages too fast'

/**
 * Text chat between the two players of a room, in the waiting room and during the match.
 * Messages are filtered for profanity, rate-limited and never logged; reported messages are
 * logged with their real text so they can be reviewed.
 */
@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: GameServer
  private readonly history: ChatHistory
  private readonly buckets = new Map<string, TokenBucket>()

  constructor(
    private readonly rooms: RoomsService,
    private readonly events: GameEventLogger,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.history = new ChatHistory(50, config.limits.maxRooms)
  }

  @SubscribeMessage(ClientEvent.ChatSend)
  send(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack {
    return toAck(() => {
      const { text } = parseChatSend(body)
      const { room, player } = this.rooms.seatOf(client.id)
      if (!this.bucketOf(client.id).take()) throw new DomainError(CHAT_TOO_FAST)
      const message = { id: randomUUID(), player, text: maskProfanity(text), sentAt: Date.now() }
      this.history.add(room.id, message)
      this.server.to(room.id).emit(ServerEvent.ChatMessage, message)
    })
  }

  @SubscribeMessage(ClientEvent.ChatReport)
  report(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack {
    return toAck(() => {
      const { messageId } = parseChatReport(body)
      const { room, player } = this.rooms.seatOf(client.id)
      const message = this.history.find(room.id, messageId)
      if (!message) throw new DomainError('That message is too old to report')
      if (message.player === player) throw new DomainError('You cannot report your own message')
      this.events.warn('chat.reported', {
        room: room.id,
        by: player === 0 ? 'host' : 'guest',
        message: message.id,
        text: message.text,
      })
    })
  }

  handleDisconnect(client: GameSocket): void {
    this.buckets.delete(client.id)
  }

  private bucketOf(socketId: string): TokenBucket {
    let bucket = this.buckets.get(socketId)
    if (!bucket) {
      bucket = new TokenBucket(CHAT_RATE.burst, CHAT_RATE.perSecond)
      this.buckets.set(socketId, bucket)
    }
    return bucket
  }
}
