export type LogLevelName = 'error' | 'warn' | 'info' | 'debug'

/** Caps that keep one client — or a flood of them — from exhausting the server. */
export interface TrafficLimits {
  /** Largest message a client may send, in bytes. Game messages are a few hundred bytes. */
  readonly maxPayloadBytes: number
  /** Open connections in total. */
  readonly maxConnections: number
  /** Open connections from one address (a household or school shares one). */
  readonly maxConnectionsPerAddress: number
  /** Rooms that may exist at the same time. */
  readonly maxRooms: number
}

export interface AppConfig {
  readonly port: number
  /** `true` allows any origin. */
  readonly corsOrigin: true | string[]
  /** How long a disconnected player keeps their seat. */
  readonly reconnectGraceMs: number
  readonly logLevel: LogLevelName
  /**
   * Behind a proxy (Render) every connection comes from the proxy, so the client address is
   * read from X-Forwarded-For. Only enable this behind a proxy that sets that header.
   */
  readonly trustProxy: boolean
  readonly limits: TrafficLimits
}

export const APP_CONFIG = Symbol('APP_CONFIG')

const DEFAULT_PORT = 5001
const DEFAULT_RECONNECT_GRACE_MS = 30_000
const LOG_LEVELS: readonly LogLevelName[] = ['error', 'warn', 'info', 'debug']

export const DEFAULT_LIMITS: TrafficLimits = {
  maxPayloadBytes: 16_384,
  maxConnections: 1_000,
  maxConnectionsPerAddress: 20,
  maxRooms: 300,
}

const positiveInt = (env: NodeJS.ProcessEnv, key: string, fallback: number): number => {
  const raw = env[key]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${key}: ${raw}`)
  return value
}

const logLevel = (raw: string | undefined): LogLevelName => {
  const level = (raw ?? 'info').toLowerCase()
  if (!LOG_LEVELS.includes(level as LogLevelName)) throw new Error(`Invalid LOG_LEVEL: ${raw}`)
  return level as LogLevelName
}

export const loadAppConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const port = Number(env.PORT ?? DEFAULT_PORT)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid PORT: ${env.PORT}`)

  const origins = (env.CORS_ORIGIN ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const reconnectGraceMs = Number(env.RECONNECT_GRACE_MS ?? DEFAULT_RECONNECT_GRACE_MS)
  if (!Number.isFinite(reconnectGraceMs) || reconnectGraceMs < 0) {
    throw new Error(`Invalid RECONNECT_GRACE_MS: ${env.RECONNECT_GRACE_MS}`)
  }

  return {
    port,
    corsOrigin: origins.length === 0 || origins.includes('*') ? true : origins,
    reconnectGraceMs,
    logLevel: logLevel(env.LOG_LEVEL),
    trustProxy: env.TRUST_PROXY === 'true',
    limits: {
      maxPayloadBytes: positiveInt(env, 'MAX_PAYLOAD_BYTES', DEFAULT_LIMITS.maxPayloadBytes),
      maxConnections: positiveInt(env, 'MAX_CONNECTIONS', DEFAULT_LIMITS.maxConnections),
      maxConnectionsPerAddress: positiveInt(
        env,
        'MAX_CONNECTIONS_PER_IP',
        DEFAULT_LIMITS.maxConnectionsPerAddress,
      ),
      maxRooms: positiveInt(env, 'MAX_ROOMS', DEFAULT_LIMITS.maxRooms),
    },
  }
}
