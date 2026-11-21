export interface AppConfig {
  readonly port: number
  /** `true` allows any origin. */
  readonly corsOrigin: true | string[]
  /** How long a disconnected player keeps their seat. */
  readonly reconnectGraceMs: number
}

export const APP_CONFIG = Symbol('APP_CONFIG')

const DEFAULT_PORT = 5001
const DEFAULT_RECONNECT_GRACE_MS = 30_000

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
  }
}
