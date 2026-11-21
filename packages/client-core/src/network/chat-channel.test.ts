import type { ChatMessage } from '@tank-tussle/protocol'
import { describe, expect, it, vi } from 'vitest'
import { ChatChannel, visibleMessages } from './chat-channel.js'
import type { GameSocket } from './game-socket.js'

const fakeSocket = () => {
  const handlers = new Map<string, (payload: unknown) => void>()
  const replies = new Map<string, unknown>()
  const socket = {
    on: (event: string, handler: (payload: unknown) => void) => handlers.set(event, handler),
    emitWithAck: vi.fn((event: string) => Promise.resolve(replies.get(event) ?? { ok: true })),
  }
  return {
    socket: socket as unknown as GameSocket,
    emitWithAck: socket.emitWithAck,
    deliver: (message: ChatMessage) => handlers.get('chat:message')?.(message),
    reply: (event: string, value: unknown) => replies.set(event, value),
  }
}

const message = (id: string, player: 0 | 1): ChatMessage => ({ id, player, text: id, sentAt: 0 })

describe('ChatChannel', () => {
  it('counts only the opponent messages as unread', () => {
    const { socket, deliver } = fakeSocket()
    const chat = new ChatChannel(socket)
    chat.enterRoom(0)
    deliver(message('mine', 0))
    deliver(message('theirs', 1))
    expect(chat.getState().messages).toHaveLength(2)
    expect(chat.getState().unread).toBe(1)
    chat.markRead()
    expect(chat.getState().unread).toBe(0)
  })

  it('hides the opponent while muted, without losing their messages', () => {
    const { socket, deliver } = fakeSocket()
    const chat = new ChatChannel(socket)
    chat.enterRoom(0)
    chat.setMuted(true)
    deliver(message('mine', 0))
    deliver(message('theirs', 1))
    expect(visibleMessages(chat.getState()).map((m) => m.id)).toEqual(['mine'])
    expect(chat.getState().unread).toBe(0)
    chat.setMuted(false)
    expect(visibleMessages(chat.getState())).toHaveLength(2)
  })

  it('starts a new room with an empty conversation but keeps it on rejoin', () => {
    const { socket, deliver } = fakeSocket()
    const chat = new ChatChannel(socket)
    chat.enterRoom(1)
    deliver(message('a', 0))
    chat.rejoin(1)
    expect(chat.getState().messages).toHaveLength(1)
    chat.enterRoom(0)
    expect(chat.getState().messages).toHaveLength(0)
  })

  it('returns the server error, or null on success, and remembers reports', async () => {
    const { socket, reply } = fakeSocket()
    const chat = new ChatChannel(socket)
    expect(await chat.send('hi')).toBeNull()
    reply('chat:send', { ok: false, error: 'You are sending messages too fast' })
    expect(await chat.send('hi')).toBe('You are sending messages too fast')
    expect(await chat.report('m1')).toBeNull()
    expect(chat.getState().reported).toEqual(['m1'])
  })
})
