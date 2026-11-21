import { describe, expect, it, vi } from 'vitest'
import type { GameSession, SessionSnapshot } from '../session/game-session.js'
import { memoryStorage } from '../storage/key-value-storage.js'
import { cpuMatchSetup, cpuOpponent, LADDER, LadderStore, trackLadderMatch } from './ladder.js'

describe('LadderStore', () => {
  it('starts with only the first rung unlocked', () => {
    const storage = memoryStorage()
    const ladder = new LadderStore(() => storage)
    expect(ladder.getBeaten()).toBe(0)
    expect(ladder.isUnlocked(1)).toBe(true)
    expect(ladder.isUnlocked(2)).toBe(false)
    expect(ladder.nextLevel()).toBe(1)
  })

  it('unlocks the next rung after a win and remembers it', () => {
    const storage = memoryStorage()
    const ladder = new LadderStore(() => storage)
    const listener = vi.fn()
    ladder.subscribe(listener)
    ladder.recordWin(1)

    expect(listener).toHaveBeenCalledOnce()
    expect(ladder.isUnlocked(2)).toBe(true)
    expect(new LadderStore(() => storage).getBeaten()).toBe(1)
  })

  it('ignores replays of beaten rungs and wins on locked ones', () => {
    const storage = memoryStorage()
    const ladder = new LadderStore(() => storage)
    ladder.recordWin(1)
    ladder.recordWin(1)
    ladder.recordWin(5)
    expect(ladder.getBeaten()).toBe(1)
  })

  it('stays on the last rung once everything is beaten', () => {
    const storage = memoryStorage()
    const ladder = new LadderStore(() => storage)
    LADDER.forEach((rung) => ladder.recordWin(rung.level))
    expect(ladder.getBeaten()).toBe(8)
    expect(ladder.nextLevel()).toBe(8)
  })
})

describe('cpu opponents', () => {
  it('never share the player colour', () => {
    expect(cpuOpponent(1, '#3ddcff').color).not.toBe('#3ddcff')
    expect(cpuOpponent(1, '#ff7849').color).toBe('#3ddcff')
  })

  it('build a match against the rung', () => {
    const setup = cpuMatchSetup({ name: 'Ada', color: '#ff7849' }, 3)
    expect(setup.mode).toBe('cpu')
    expect(setup.cpuLevel).toBe(3)
    expect(setup.players[1].name).toBe('Gunner')
  })
})

describe('trackLadderMatch', () => {
  const fakeSession = () => {
    let snapshot = { state: { phase: 'playing', result: null }, pendingShot: null }
    const listeners = new Set<() => void>()
    const session = {
      getSnapshot: () => snapshot as unknown as SessionSnapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    } as unknown as GameSession
    const finish = (result: 0 | 1 | 'draw') => {
      snapshot = { state: { phase: 'over', result }, pendingShot: null } as never
      listeners.forEach((listener) => listener())
    }
    return { session, finish }
  }

  it('records a win for the player only', () => {
    const storage = memoryStorage()
    const ladder = new LadderStore(() => storage)
    const lost = fakeSession()
    trackLadderMatch(lost.session, 1, ladder)
    lost.finish(1)
    expect(ladder.getBeaten()).toBe(0)

    const won = fakeSession()
    trackLadderMatch(won.session, 1, ladder)
    won.finish(0)
    expect(ladder.getBeaten()).toBe(1)
  })
})
