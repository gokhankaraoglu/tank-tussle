interface Handshake {
  readonly address: string
  readonly headers: Readonly<Record<string, string | string[] | undefined>>
}

/**
 * The address a connection comes from. Behind a proxy that is the first X-Forwarded-For entry;
 * without one it is the socket's own address. Only used for per-address connection limits.
 */
export const clientAddress = (handshake: Handshake, trustProxy: boolean): string => {
  const forwarded = handshake.headers['x-forwarded-for']
  const header = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const first = header?.split(',')[0]?.trim()
  return trustProxy && first ? first : handshake.address
}
