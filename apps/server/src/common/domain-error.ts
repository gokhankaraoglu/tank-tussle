/** An expected, user-facing failure (bad room id, full room…). Safe to send to clients. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
