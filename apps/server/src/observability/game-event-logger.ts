import { Injectable, Logger } from '@nestjs/common'

/** Values a log line may carry. Objects are not allowed, so nothing large or nested leaks in. */
export type EventFields = Readonly<Record<string, string | number | boolean | null | undefined>>

/** Field names whose values must never reach the logs, whatever a caller passes. */
const SECRET_FIELD = /token|secret|password|credential/i

const formatValue = (value: string | number | boolean | null): string => {
  const text = String(value)
  return /[\s"=]/.test(text) ? JSON.stringify(text) : text
}

/**
 * One line per event: a fixed name first, then `key=value` pairs, e.g.
 * `match.ended room=ab12cd result=host score=212-187`. Easy to read and to search in Render.
 */
export const formatEvent = (event: string, fields: EventFields = {}): string =>
  [
    event,
    ...Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) =>
        SECRET_FIELD.test(key) ? `${key}=[redacted]` : `${key}=${formatValue(value ?? null)}`,
      ),
  ].join(' ')

/**
 * The game's important moments (rooms, matches, seats, refused or throttled clients) in a
 * consistent format. Player names are never logged; rooms are identified by their code.
 */
@Injectable()
export class GameEventLogger {
  private readonly logger = new Logger('Game')

  info(event: string, fields?: EventFields): void {
    this.logger.log(formatEvent(event, fields))
  }

  warn(event: string, fields?: EventFields): void {
    this.logger.warn(formatEvent(event, fields))
  }

  debug(event: string, fields?: EventFields): void {
    this.logger.debug(formatEvent(event, fields))
  }
}
