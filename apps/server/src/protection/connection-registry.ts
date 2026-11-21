import type { TrafficLimits } from '../config/app-config.js'

export type Admission = 'admitted' | 'server-full' | 'too-many-from-address'

/** Counts open connections in total and per address, and refuses new ones above the limits. */
export class ConnectionRegistry {
  private total = 0
  private readonly perAddress = new Map<string, number>()

  constructor(
    private readonly limits: Pick<TrafficLimits, 'maxConnections' | 'maxConnectionsPerAddress'>,
  ) {}

  admit(address: string): Admission {
    if (this.total >= this.limits.maxConnections) return 'server-full'
    const current = this.perAddress.get(address) ?? 0
    if (current >= this.limits.maxConnectionsPerAddress) return 'too-many-from-address'
    this.total++
    this.perAddress.set(address, current + 1)
    return 'admitted'
  }

  release(address: string): void {
    const current = this.perAddress.get(address)
    if (current === undefined) return
    this.total = Math.max(0, this.total - 1)
    if (current <= 1) this.perAddress.delete(address)
    else this.perAddress.set(address, current - 1)
  }

  get openConnections(): number {
    return this.total
  }
}
