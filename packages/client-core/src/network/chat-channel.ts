import type { PlayerIndex } from '@tank-tussle/game-core'
import { ClientEvent, ServerEvent, type Ack, type ChatMessage } from '@tank-tussle/protocol'
import type { GameSocket } from './game-socket.js'
import { Listeners } from './listeners.js'

/** Messages kept on the device; older ones scroll away. */
const KEEP = 100

export interface ChatState {
  readonly messages: readonly ChatMessage[]
  /** This device's seat in the room, to tell own messages from the opponent's. */
  readonly you: PlayerIndex | null
  /** Hides the opponent's messages (they still arrive, so unmuting shows them again). */
  readonly muted: boolean
  /** Opponent messages arrived since the chat was last open. */
  readonly unread: number
  /** Messages this player has reported, so the button can say so. */
  readonly reported: readonly string[]
}

const EMPTY: ChatState = { messages: [], you: null, muted: false, unread: 0, reported: [] }

/** The messages a player should see: their own, plus the opponent's unless muted. */
export const visibleMessages = (state: ChatState): readonly ChatMessage[] =>
  state.muted ? state.messages.filter((message) => message.player === state.you) : state.messages

/**
 * Chat of the current room. Lives on the connection, so messages from the waiting room are
 * still there once the match starts. Returns an error message from `send`/`report`, or null.
 */
export class ChatChannel {
  private state: ChatState = EMPTY
  private readonly listeners = new Listeners<ChatState>()

  constructor(private readonly socket: GameSocket) {
    socket.on(ServerEvent.ChatMessage, (message) => this.receive(message))
  }

  getState = (): ChatState => this.state

  subscribe = (listener: () => void): (() => void) => this.listeners.add(listener)

  /** A new room: earlier messages belong to someone else's conversation. */
  enterRoom(you: PlayerIndex): void {
    this.update({ ...EMPTY, you, muted: this.state.muted })
  }

  /** The same room after a reconnect: keep the conversation. */
  rejoin(you: PlayerIndex): void {
    this.update({ ...this.state, you })
  }

  leaveRoom(): void {
    this.update({ ...EMPTY, muted: this.state.muted })
  }

  async send(text: string): Promise<string | null> {
    const reply: Ack = await this.socket.emitWithAck(ClientEvent.ChatSend, { text })
    return reply.ok ? null : reply.error
  }

  async report(messageId: string): Promise<string | null> {
    const reply: Ack = await this.socket.emitWithAck(ClientEvent.ChatReport, { messageId })
    if (reply.ok) this.update({ ...this.state, reported: [...this.state.reported, messageId] })
    return reply.ok ? null : reply.error
  }

  setMuted(muted: boolean): void {
    this.update({ ...this.state, muted, unread: muted ? 0 : this.state.unread })
  }

  markRead(): void {
    if (this.state.unread > 0) this.update({ ...this.state, unread: 0 })
  }

  private receive(message: ChatMessage): void {
    const fromOpponent = message.player !== this.state.you
    this.update({
      ...this.state,
      messages: [...this.state.messages, message].slice(-KEEP),
      unread: this.state.unread + (fromOpponent && !this.state.muted ? 1 : 0),
    })
  }

  private update(next: ChatState): void {
    this.state = next
    this.listeners.emit(next)
  }
}
