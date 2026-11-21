import type { ClientToServerEvents, ServerToClientEvents } from '@tank-tussle/protocol'
import type { Server, Socket } from 'socket.io'

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>
