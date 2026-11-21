/** Minimal typed event emitter for in-process notifications. */
export class Listeners<T> {
  private readonly listeners = new Set<(value: T) => void>()

  add(listener: (value: T) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(value: T): void {
    this.listeners.forEach((listener) => listener(value))
  }

  clear(): void {
    this.listeners.clear()
  }
}
