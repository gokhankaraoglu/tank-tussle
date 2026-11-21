import { createDefaultWeaponRegistry, openSlots } from '@tank-tussle/game-core'
import { describe, expect, it } from 'vitest'
import { activeLocalPlayer } from './game-session.js'
import { LocalGameSession } from './local-game-session.js'
import { cpu, HUMAN, IDLE } from './player-controller.js'
import type { Scheduler } from './scheduler.js'

const registry = createDefaultWeaponRegistry()
const players = [
  { name: 'Ada', color: '#ff0000' },
  { name: 'Bot', color: '#0000ff' },
] as const

/** Runs scheduled callbacks only when the test says so. */
class ManualScheduler implements Scheduler {
  private queue: (() => void)[] = []
  schedule(callback: () => void) {
    this.queue.push(callback)
    return () => (this.queue = this.queue.filter((item) => item !== callback))
  }
  flush() {
    const queue = this.queue
    this.queue = []
    queue.forEach((callback) => callback())
  }
  get size() {
    return this.queue.length
  }
}

const createSession = (
  mode: 'versus' | 'practice',
  controllers: Parameters<typeof cpu>[0] | 'hot-seat' | 'practice',
) => {
  const scheduler = new ManualScheduler()
  const session = new LocalGameSession({
    match: { mode, players, weaponsPerPlayer: 2, shopSize: 4 },
    controllers:
      controllers === 'hot-seat'
        ? [HUMAN, HUMAN]
        : controllers === 'practice'
          ? [HUMAN, IDLE]
          : [HUMAN, cpu(controllers)],
    registry,
    scheduler,
    seedSource: () => 11,
  })
  return { session, scheduler }
}

/** Picks the first weapon nobody has taken yet, as a player clicking the shop would. */
const pickOpen = (session: LocalGameSession) =>
  session.pick(openSlots(session.getSnapshot().state.shop)[0]!)

describe('LocalGameSession', () => {
  it('lets the CPU pick right after the human in the shop', () => {
    const { session } = createSession('versus', 5)
    pickOpen(session)
    const { state } = session.getSnapshot()
    expect(state.inventories[0]).toHaveLength(1)
    expect(state.inventories[1]).toHaveLength(1)
    expect(state.shop.picker).toBe(0)
  })

  it('deals every weapon on random pick, against the CPU too', () => {
    const { session } = createSession('versus', 5)
    session.dealAll()
    const { state } = session.getSnapshot()
    expect(state.phase).toBe('playing')
    expect(state.inventories.map((items) => items.length)).toEqual([2, 2])
  })

  it('deals for both players in hot-seat games', () => {
    const { session } = createSession('versus', 'hot-seat')
    session.dealAll()
    expect(session.getSnapshot().state.phase).toBe('playing')
  })

  it('holds the new state back until the shot animation completes', () => {
    const { session } = createSession('versus', 'hot-seat')
    pickOpen(session)
    pickOpen(session)
    pickOpen(session)
    pickOpen(session)

    session.fire(0)
    const pending = session.getSnapshot()
    expect(pending.pendingShot).not.toBeNull()
    expect(pending.state.turn).toBe(0)
    expect(activeLocalPlayer(pending)).toBeNull()

    session.completeShot()
    expect(session.getSnapshot().state.turn).toBe(1)
    expect(session.getSnapshot().pendingShot).toBeNull()
  })

  it('schedules the CPU turn and fires when the timer elapses', () => {
    const { session, scheduler } = createSession('versus', 8)
    pickOpen(session)
    pickOpen(session)
    session.fire(0)
    session.completeShot()

    expect(scheduler.size).toBe(1)
    scheduler.flush()
    expect(session.getSnapshot().pendingShot?.player).toBe(1)
  })

  it('reports rule violations as errors instead of throwing', () => {
    const { session } = createSession('practice', 'practice')
    for (let i = 0; i < 5; i++) session.move(1)
    expect(session.getSnapshot().error).toBe('No moves left')
  })

  it('starts a fresh match on rematch and cancels pending CPU turns', () => {
    const { session, scheduler } = createSession('versus', 8)
    pickOpen(session)
    pickOpen(session)
    session.fire(0)
    session.completeShot()
    session.rematch()

    expect(scheduler.size).toBe(0)
    expect(session.getSnapshot().state.phase).toBe('shop')
  })
})
