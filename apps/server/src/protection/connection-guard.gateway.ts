import { Inject } from '@nestjs/common'
import {
  WebSocketGateway,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets'
import { ClientEvent, PROTOCOL_MISMATCH, PROTOCOL_VERSION } from '@tank-tussle/protocol'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'
import type { GameServer, GameSocket } from '../gateway/socket-types.js'
import { GameEventLogger } from '../observability/game-event-logger.js'
import { clientAddress } from './client-address.js'
import { ConnectionRegistry } from './connection-registry.js'
import { TokenBucket } from './token-bucket.js'

/** Sent to a refused connection; the client shows "offline" and retries with back-off. */
export const SERVER_BUSY = 'SERVER_BUSY'
export const TOO_MANY_REQUESTS = 'Too many requests, slow down'

/** Aim updates stream while dragging (the client throttles them to 20/s); the rest are clicks. */
const AIM_RATE = { burst: 40, perSecond: 30 } as const
const ACTION_RATE = { burst: 15, perSecond: 5 } as const
/** A client that keeps flooding after being throttled this often is disconnected. */
const MAX_THROTTLED = 100

interface GuardedSocketData {
  address?: string
}

/**
 * Admission control in front of the game: checks the protocol version, caps connections per
 * address and in total, and rate-limits every client's messages. Keeps a misbehaving or
 * flooding client from exhausting memory or CPU; it cannot stop a network-level flood.
 */
@WebSocketGateway()
export class ConnectionGuardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly registry: ConnectionRegistry

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly events: GameEventLogger,
  ) {
    this.registry = new ConnectionRegistry(config.limits)
  }

  afterInit(server: GameServer): void {
    server.use((socket, next) => {
      const version: unknown = socket.handshake.auth?.protocolVersion
      if (version !== PROTOCOL_VERSION) {
        this.events.warn('connection.refused', {
          reason: 'protocol-mismatch',
          client: String(version),
          server: PROTOCOL_VERSION,
        })
        return next(new Error(PROTOCOL_MISMATCH))
      }
      const address = clientAddress(socket.handshake, this.config.trustProxy)
      const admission = this.registry.admit(address)
      if (admission !== 'admitted') {
        this.events.warn('connection.refused', {
          reason: admission,
          open: this.registry.openConnections,
        })
        return next(new Error(SERVER_BUSY))
      }
      ;(socket.data as GuardedSocketData).address = address
      next()
    })
  }

  handleConnection(socket: GameSocket): void {
    const aim = new TokenBucket(AIM_RATE.burst, AIM_RATE.perSecond)
    const actions = new TokenBucket(ACTION_RATE.burst, ACTION_RATE.perSecond)
    let throttled = 0

    socket.use((packet, next) => {
      const bucket = packet[0] === ClientEvent.Aim ? aim : actions
      if (bucket.take()) return next()

      throttled++
      // Answer requests that expect a reply, so the client is not left waiting forever.
      const ack: unknown = packet[packet.length - 1]
      if (typeof ack === 'function') ack({ ok: false, error: TOO_MANY_REQUESTS })
      if (throttled === 1) this.events.warn('client.throttled', { event: String(packet[0]) })
      if (throttled >= MAX_THROTTLED) {
        this.events.warn('client.disconnected', { reason: 'flooding', throttled })
        socket.disconnect(true)
      }
    })
  }

  handleDisconnect(socket: GameSocket): void {
    const { address } = socket.data as GuardedSocketData
    if (address !== undefined) this.registry.release(address)
  }
}
