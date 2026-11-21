import type { PlayerIndex } from '@tank-tussle/game-core'
import { InvalidPayloadError } from './validation.js'

export const CHAT_LIMITS = {
  /** Longest message, in characters, after trimming. */
  maxLength: 200,
} as const

/** A chat line as the server relays it. `text` has already been filtered for profanity. */
export interface ChatMessage {
  /** Unique within the room; used to report a message. */
  readonly id: string
  readonly player: PlayerIndex
  readonly text: string
  /** Epoch ms when the server received it. */
  readonly sentAt: number
}

export interface ChatSendPayload {
  readonly text: string
}

export interface ChatReportPayload {
  readonly messageId: string
}

/** Control characters and invisible zero-width or direction-changing characters. */
// Matching control characters is the point here: they are stripped from chat text.
/* eslint-disable no-control-regex */
const INVISIBLE = new RegExp(
  '[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2064\\ufeff]',
  'g',
)
/* eslint-enable no-control-regex */

/** Trims, collapses whitespace and strips invisible characters, then enforces the length. */
export const parseChatSend = (input: unknown): ChatSendPayload => {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidPayloadError('Expected an object')
  }
  const raw = (input as Record<string, unknown>).text
  if (typeof raw !== 'string') throw new InvalidPayloadError('text must be a string')
  const text = raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim()
  if (text.length === 0) throw new InvalidPayloadError('Message is empty')
  if ([...text].length > CHAT_LIMITS.maxLength) {
    throw new InvalidPayloadError(`Messages can be at most ${CHAT_LIMITS.maxLength} characters`)
  }
  return { text }
}

export const parseChatReport = (input: unknown): ChatReportPayload => {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidPayloadError('Expected an object')
  }
  const messageId = (input as Record<string, unknown>).messageId
  if (typeof messageId !== 'string' || messageId.length === 0 || messageId.length > 64) {
    throw new InvalidPayloadError('messageId must be a short string')
  }
  return { messageId }
}
