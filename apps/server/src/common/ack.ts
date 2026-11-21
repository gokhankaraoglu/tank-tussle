import { Logger } from '@nestjs/common'
import { MatchRuleError } from '@tank-tussle/game-core'
import { InvalidPayloadError, type Ack } from '@tank-tussle/protocol'
import { DomainError } from './domain-error.js'

const logger = new Logger('Ack')

const EXPECTED_ERRORS = [DomainError, MatchRuleError, InvalidPayloadError] as const

export const isExpectedError = (error: unknown): error is Error =>
  EXPECTED_ERRORS.some((type) => error instanceof type)

/** Runs a handler and turns its result or a rule violation into an acknowledgement. */
export const toAck = <T>(run: () => T): Ack<T> => {
  try {
    return { ok: true, data: run() }
  } catch (error) {
    if (isExpectedError(error)) return { ok: false, error: error.message }
    logger.error(error instanceof Error ? error.stack : String(error))
    return { ok: false, error: 'Something went wrong' }
  }
}
