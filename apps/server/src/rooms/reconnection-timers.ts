import { Injectable, type OnModuleDestroy } from '@nestjs/common'

/** One timer per seat token: fires when a disconnected player runs out of time. */
@Injectable()
export class ReconnectionTimers implements OnModuleDestroy {
  private readonly timers = new Map<string, NodeJS.Timeout>()

  schedule(token: string, delayMs: number, onExpire: () => void): void {
    this.cancel(token)
    this.timers.set(
      token,
      setTimeout(() => {
        this.timers.delete(token)
        onExpire()
      }, delayMs),
    )
  }

  cancel(token: string): void {
    clearTimeout(this.timers.get(token))
    this.timers.delete(token)
  }

  onModuleDestroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
  }
}
