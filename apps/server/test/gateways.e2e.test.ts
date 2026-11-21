import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { Test } from '@nestjs/testing'
import {
  ClientEvent,
  PROTOCOL_VERSION,
  ServerEvent,
  type Ack,
  type ClientToServerEvents,
  type MatchStartedPayload,
  type RoomJoinedPayload,
  type ServerToClientEvents,
  type ShotPayload,
} from '@tank-tussle/protocol'
import { io, type Socket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { APP_CONFIG, type AppConfig } from '../src/config/app-config.js'
import { SEED_SOURCE } from '../src/matches/tokens.js'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

const GRACE_MS = 300
const host = { name: 'Host', color: '#ff0000' }
const guest = { name: 'Guest', color: '#0000ff' }
const settings = { visibility: 'public', weaponsPerPlayer: 5 } as const

const once = <T>(socket: Client, event: keyof ServerToClientEvents): Promise<T> =>
  new Promise((resolve) => socket.once(event, ((payload: T) => resolve(payload)) as never))

const unwrap = <T>(ack: Ack<T>): T => {
  if (!ack.ok) throw new Error(ack.error)
  return ack.data
}

describe('Lobby and match gateways (e2e)', () => {
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

  /** Host creates, guest joins, host starts. Returns both sockets and their seats. */
  const startGame = async () => {
    const [a, b] = [await connect(), await connect()]
    const created = unwrap(await a.emitWithAck(ClientEvent.CreateRoom, { profile: host, settings }))
    const joined = unwrap(
      await b.emitWithAck(ClientEvent.JoinRoom, {
        roomId: created.room.id.toUpperCase(),
        profile: guest,
      }),
    )
    const started = [
      once<MatchStartedPayload>(a, ServerEvent.MatchStarted),
      once<MatchStartedPayload>(b, ServerEvent.MatchStarted),
    ]
    expect(await a.emitWithAck(ClientEvent.StartMatch)).toEqual({ ok: true })
    const [hostStart] = await Promise.all(started)
    return { a, b, created, joined, state: hostStart!.state }
  }

  beforeEach(async () => {
    const config: AppConfig = { port: 0, corsOrigin: true, reconnectGraceMs: GRACE_MS }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SEED_SOURCE)
      .useValue(() => 7)
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .compile()
    app = moduleRef.createNestApplication()
    app.useWebSocketAdapter(new IoAdapter(app))
    await app.listen(0)
    url = await app.getUrl()
  })

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.disconnect())
    await app.close()
  })

  it('creates, joins and starts a game with the chosen settings', async () => {
    const a = await connect()
    const b = await connect()
    const created: RoomJoinedPayload = unwrap(
      await a.emitWithAck(ClientEvent.CreateRoom, { profile: host, settings }),
    )
    expect(created.you).toBe(0)
    expect(await b.emitWithAck(ClientEvent.ListRooms)).toEqual([
      { id: created.room.id, hostName: 'Host', hostColor: '#ff0000', weaponsPerPlayer: 5 },
    ])

    const hostSeesGuest = once<{ room: RoomJoinedPayload['room'] }>(a, ServerEvent.RoomUpdated)
    const joined = unwrap(
      await b.emitWithAck(ClientEvent.JoinRoom, { roomId: created.room.id, profile: guest }),
    )
    expect(joined.you).toBe(1)
    expect((await hostSeesGuest).room.guest?.name).toBe('Guest')

    expect(await b.emitWithAck(ClientEvent.StartMatch)).toEqual({
      ok: false,
      error: 'Only the host can start the game',
    })
    const started = once<MatchStartedPayload>(b, ServerEvent.MatchStarted)
    expect(await a.emitWithAck(ClientEvent.StartMatch)).toEqual({ ok: true })
    const { state, you } = await started
    expect(you).toBe(1)
    expect(state.config.weaponsPerPlayer).toBe(5)
    expect(state.shop.pool).toHaveLength(10)
  })

  it('runs the draft and relays a shot', async () => {
    const game = await startGame()
    const { a, b } = game
    let state = await draft(a, b, game.state)
    expect(state.phase).toBe('playing')

    expect(await b.emitWithAck(ClientEvent.Fire, { angle: 45, power: 50, slot: 0 })).toEqual({
      ok: false,
      error: 'It is not your turn',
    })
    const shot = once<ShotPayload>(b, ServerEvent.Shot)
    expect((await a.emitWithAck(ClientEvent.Fire, { angle: 60, power: 55, slot: 0 })).ok).toBe(true)
    state = (await shot).state
    expect(state.turn).toBe(1)
  })

  it('deals every weapon to both players on random pick', async () => {
    const { a, b } = await startGame()
    expect(await b.emitWithAck(ClientEvent.DealAll)).toEqual({
      ok: false,
      error: 'Wait for your pick to deal the weapons',
    })

    const dealt = once<{ state: MatchStartedPayload['state'] }>(b, ServerEvent.MatchState)
    expect(await a.emitWithAck(ClientEvent.DealAll)).toEqual({ ok: true })
    const { state } = await dealt
    expect(state.phase).toBe('playing')
    expect(state.inventories.map((items) => items.length)).toEqual([5, 5])
  })

  it('lets a disconnected player resume the same match from a new socket', async () => {
    const { a, b, joined } = await startGame()
    const hostNotified = once<{ room: RoomJoinedPayload['room'] }>(a, ServerEvent.RoomUpdated)
    b.disconnect()
    const { room } = await hostNotified
    expect(room.guest).toMatchObject({ connected: false })
    expect(room.guest?.reconnectDeadline).toBeGreaterThan(Date.now())

    const back = await connect()
    const hostSeesReturn = once<{ room: RoomJoinedPayload['room'] }>(a, ServerEvent.RoomUpdated)
    const resumed = unwrap(
      await back.emitWithAck(ClientEvent.Resume, { token: joined.credentials.token }),
    )
    expect(resumed.you).toBe(1)
    expect(resumed.match?.phase).toBe('shop')
    expect((await hostSeesReturn).room.guest?.connected).toBe(true)

    // The resumed socket can act for the seat.
    expect((await a.emitWithAck(ClientEvent.PickWeapon, { poolIndex: 0 })).ok).toBe(true)
    expect((await back.emitWithAck(ClientEvent.PickWeapon, { poolIndex: 1 })).ok).toBe(true)
  })

  it('closes the room when the grace period runs out', async () => {
    const { a, b, joined } = await startGame()
    const closed = once<{ reason: string }>(a, ServerEvent.RoomClosed)
    b.disconnect()
    expect(await closed).toEqual({ reason: 'opponent-timed-out' })

    const late = await connect()
    expect(await late.emitWithAck(ClientEvent.Resume, { token: joined.credentials.token })).toEqual(
      {
        ok: false,
        error: 'That game is no longer available',
      },
    )
  })

  it('tells the guest when the host closes the room', async () => {
    const a = await connect()
    const b = await connect()
    const created = unwrap(await a.emitWithAck(ClientEvent.CreateRoom, { profile: host, settings }))
    unwrap(await b.emitWithAck(ClientEvent.JoinRoom, { roomId: created.room.id, profile: guest }))
    const closed = once<{ reason: string }>(b, ServerEvent.RoomClosed)
    a.emit(ClientEvent.LeaveRoom)
    expect(await closed).toEqual({ reason: 'host-left' })
  })

  it('refuses clients built for another protocol version', async () => {
    const outdated: Client = io(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: { protocolVersion: PROTOCOL_VERSION - 1 },
    })
    clients.push(outdated)
    const error = await new Promise<Error>((resolve) => outdated.on('connect_error', resolve))
    expect(error.message).toBe('PROTOCOL_MISMATCH')
  })

  it('rejects malformed payloads with a readable error', async () => {
    const client = await connect()
    const reply = await client.emitWithAck(ClientEvent.CreateRoom, {
      profile: { name: '', color: 'nope' },
      settings,
    } as never)
    expect(reply).toEqual({ ok: false, error: 'name must be 1–16 characters' })
  })
})

/** Both players pick until the battle starts; returns the first battle state. */
async function draft(a: Client, b: Client, initial: MatchStartedPayload['state']) {
  const sockets = [a, b]
  let state = initial
  while (state.phase === 'shop') {
    const next = once<{ state: typeof state }>(a, ServerEvent.MatchState)
    expect(
      (
        await sockets[state.shop.picker]!.emitWithAck(ClientEvent.PickWeapon, {
          poolIndex: state.shop.takenBy.indexOf(null),
        })
      ).ok,
    ).toBe(true)
    state = (await next).state
  }
  return state
}
