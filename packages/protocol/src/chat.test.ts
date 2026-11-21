import { describe, expect, it } from 'vitest'
import { CHAT_LIMITS, parseChatReport, parseChatSend } from './chat.js'
import { InvalidPayloadError } from './validation.js'

describe('parseChatSend', () => {
  it('trims, collapses whitespace and strips invisible characters', () => {
    expect(parseChatSend({ text: '  good \n\n  luck​!  ' })).toEqual({ text: 'good luck!' })
  })

  it('rejects empty and overly long messages', () => {
    expect(() => parseChatSend({ text: '   ​ ' })).toThrow(InvalidPayloadError)
    expect(() => parseChatSend({ text: 'x'.repeat(CHAT_LIMITS.maxLength + 1) })).toThrow('at most')
    expect(parseChatSend({ text: 'x'.repeat(CHAT_LIMITS.maxLength) }).text).toHaveLength(
      CHAT_LIMITS.maxLength,
    )
  })

  it('rejects anything that is not a text message', () => {
    expect(() => parseChatSend('hi')).toThrow(InvalidPayloadError)
    expect(() => parseChatSend({ text: 42 })).toThrow(InvalidPayloadError)
  })
})

describe('parseChatReport', () => {
  it('accepts a message id and rejects anything else', () => {
    expect(parseChatReport({ messageId: 'abc-1' })).toEqual({ messageId: 'abc-1' })
    expect(() => parseChatReport({ messageId: '' })).toThrow(InvalidPayloadError)
    expect(() => parseChatReport({})).toThrow(InvalidPayloadError)
  })
})
