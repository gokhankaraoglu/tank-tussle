import { describe, expect, it } from 'vitest'
import { formatEvent } from './game-event-logger.js'

describe('formatEvent', () => {
  it('writes the event name followed by key=value pairs', () => {
    expect(formatEvent('match.ended', { room: 'ab12cd', result: 'host', shots: 20 })).toBe(
      'match.ended room=ab12cd result=host shots=20',
    )
  })

  it('never writes secrets, whatever the caller passes', () => {
    const line = formatEvent('seat.resumed', { room: 'ab12cd', token: 'abc', seatToken: 'x' })
    expect(line).toBe('seat.resumed room=ab12cd token=[redacted] seatToken=[redacted]')
  })

  it('quotes values with spaces and skips missing ones', () => {
    expect(formatEvent('request.rejected', { reason: 'Not your turn', extra: undefined })).toBe(
      'request.rejected reason="Not your turn"',
    )
  })
})
