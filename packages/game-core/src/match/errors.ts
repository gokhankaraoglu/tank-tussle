/** Thrown when a player tries an action the rules do not allow right now. */
export class MatchRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatchRuleError'
  }
}
