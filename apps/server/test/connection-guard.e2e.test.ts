import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { Test } from '@nestjs/testing'
import {
  ClientEvent,
  PROTOCOL_VERSION,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@tank-tussle/protocol'
import { io, type Socket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { APP_CONFIG, loadAppConfig, type AppConfig } from '../src/config/app-config.js'
import { SERVER_BUSY, TOO_MANY_REQUESTS } from '../src/protection/connection-guard.gateway.js'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

const profile = { name: 'Host', color: '#ff0000' }
const settings = { visibility: 'public', weaponsPerPlayer: 5 } as const

describe('Connection guard (e2e)', () => {
  let app: INestApplication
  let url: string
  const clients: Client[] = []

  const open = (protocolVersion: unknown = PROTOCOL_VERSION): Client => {
    const client: Client = io(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: { protocolVersion },
    })
    clients.push(client)
    return client
  }

  /** Resolves with null when connected, or with the server's refusal message. */
  const outcome = (client: Client): Promise<string | null> =>
    new Promise((resolve) => {
      client.once('connect', () => resolve(null))
      client.once('connect_error', (error) => resolve(error.message))
    })

  beforeEach(async () => {
    const base = loadAppConfig({})
    const config: AppConfig = {
      ...base,
      port: 0,
      limits: { ...base.limits, maxConnectionsPerAddress: 2, maxRooms: 1 },
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .compile()
    app = moduleRef.createNestApplication({ logger: false })
    app.useWebSocketAdapter(new IoAdapter(app))
    await app.listen(0)
    url = await app.getUrl()
  })

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.disconnect())
    await app.close()
  })

  it('refuses clients that speak another protocol version', async () => {
    expect(await outcome(open(-1))).toBe('PROTOCOL_MISMATCH')
  })

  it('caps connections per address and frees the slot on disconnect', async () => {
    const first = open()
    expect(await outcome(first)).toBeNull()
    expect(await outcome(open())).toBeNull()
    expect(await outcome(open())).toBe(SERVER_BUSY)

    first.disconnect()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(await outcome(open())).toBeNull()
  })

  it('throttles a client that floods requests and answers it instead of hanging', async () => {
    const client = open()
    await outcome(client)
    const replies = await Promise.all(
      Array.from({ length: 30 }, () => client.emitWithAck(ClientEvent.StartMatch)),
    )
    const throttled = replies.filter((reply) => !reply.ok && reply.error === TOO_MANY_REQUESTS)
    expect(throttled.length).toBeGreaterThan(0)
    expect(throttled.length).toBeLessThan(30)
  })

  it('stops creating rooms at the room limit', async () => {
    const [a, b] = [open(), open()]
    await Promise.all([outcome(a), outcome(b)])
    expect((await a.emitWithAck(ClientEvent.CreateRoom, { profile, settings })).ok).toBe(true)
    const refused = await b.emitWithAck(ClientEvent.CreateRoom, { profile, settings })
    expect(refused).toEqual({
      ok: false,
      error: 'The server is busy right now. Try again in a minute.',
    })
  })
})
