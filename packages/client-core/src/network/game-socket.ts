import {
  PROTOCOL_VERSION,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@tank-tussle/protocol'
import { io, type Socket } from 'socket.io-client'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/** Used when a build does not configure a server (local development). */
export const DEFAULT_SERVER_URL = 'http://localhost:5001'

export const connectGameSocket = (url: string): GameSocket =>
  io(url, {
    transports: ['websocket'],
    reconnection: true,
    auth: { protocolVersion: PROTOCOL_VERSION },
  })
