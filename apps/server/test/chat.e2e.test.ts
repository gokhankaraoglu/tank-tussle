import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { Test } from '@nestjs/testing'
import {
  ClientEvent,
  PROTOCOL_VERSION,
  ServerEvent,
  type Ack,
  type ChatMessage,
  type ClientToServerEvents,
  type RoomJoinedPayload,
  type ServerToClientEvents,
} from '@tank-tussle/protocol'
import { io, type Socket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { CHAT_TOO_FAST } from '../src/chat/chat.gateway.js'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

const settings = { visibility: 'private', weaponsPerPlayer: 5 } as const

const unwrap = <T>(ack: Ack<T>): T => {
  if (!ack.ok) throw new Error(ack.error)
  return ack.data
}

describe('Chat (e2e)', () => {
  let app: INestApplication
  let url: string
  const clients: Client[] = []

  const connect = async (): Promise<Client> => {
    const client: Client = io(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: { protocolVersion: PROTOCOL_VERSION },
    })
    clients.push(client)
    await new Promise<void>((resolve) => client.on('connect', resolve))
    return client
  }

  /** Host and guest in one waiting room. */
  const room = async () => {
    const [host, guest] = [await connect(), await connect()]
    const created: RoomJoinedPayload = unwrap(
      await host.emitWithAck(ClientEvent.CreateRoom, {
        profile: { name: 'Host', color: '#ff0000' },
        settings,
      }),
    )
    unwrap(
      await guest.emitWithAck(ClientEvent.JoinRoom, {
        roomId: created.room.id,
        profile: { name: 'Guest', color: '#0000ff' },
      }),
    )
    return { host, guest }
  }

  const nextMessage = (client: Client): Promise<ChatMessage> =>
    new Promise((resolve) => client.once(ServerEvent.ChatMessage, resolve))

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    app.useWebSocketAdapter(new IoAdapter(app))
    await app.listen(0)
    url = await app.getUrl()
  })

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.disconnect())
    await app.close()
  })

  it('relays a filtered message to both players', async () => {
    const { host, guest } = await room()
    const received = [nextMessage(host), nextMessage(guest)]
    expect(
      await guest.emitWithAck(ClientEvent.ChatSend, { text: '  good luck, siktir  ' }),
    ).toEqual({ ok: true })
    const [atHost, atGuest] = await Promise.all(received)
    expect(atHost).toEqual(atGuest)
    expect(atHost!.player).toBe(1)
    expect(atHost!.text).toBe('good luck, ******')
  })

  it('refuses players who are not in a room', async () => {
    const lonely = await connect()
    const reply = await lonely.emitWithAck(ClientEvent.ChatSend, { text: 'hello?' })
    expect(reply.ok).toBe(false)
  })

  it('slows down a player who sends too fast', async () => {
    const { host } = await room()
    const replies = []
    for (let index = 0; index < 6; index++) {
      replies.push(await host.emitWithAck(ClientEvent.ChatSend, { text: `message ${index}` }))
    }
    expect(replies.slice(0, 4).every((reply) => reply.ok)).toBe(true)
    expect(replies.at(-1)).toEqual({ ok: false, error: CHAT_TOO_FAST })
  })

  it("lets a player report the opponent's message but not their own", async () => {
    const { host, guest } = await room()
    const sent = nextMessage(host)
    await guest.emitWithAck(ClientEvent.ChatSend, { text: 'you are bad' })
    const message = await sent

    expect(await host.emitWithAck(ClientEvent.ChatReport, { messageId: message.id })).toEqual({
      ok: true,
    })
    expect(await guest.emitWithAck(ClientEvent.ChatReport, { messageId: message.id })).toEqual({
      ok: false,
      error: 'You cannot report your own message',
    })
  })
})
