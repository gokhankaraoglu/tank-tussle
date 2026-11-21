import {
  createDefaultWeaponRegistry,
  createMatch,
  fire,
  type ShotEvent,
} from '@tank-tussle/game-core'
import { describe, expect, it } from 'vitest'
import { soundForEvent } from './shot-sounds.js'

const explosion = (radius: number): ShotEvent => ({
  kind: 'explosion',
  tick: 0,
  x: 0,
  y: 0,
  radius,
})

describe('soundForEvent', () => {
  it('uses the weapon specific sound when there is one', () => {
    expect(soundForEvent({ kind: 'launch', tick: 0, x: 0, y: 0 }, 'bloodhound')?.id).toBe('lockOn')
    expect(soundForEvent(explosion(20), 'sparkler')?.id).toBe('sparkler')
  })

  it('falls back to sounds chosen by blast size', () => {
    expect(soundForEvent(explosion(10), 'unknown-weapon')?.id).toBe('explosionSmall')
    expect(soundForEvent(explosion(70), 'unknown-weapon')?.id).toBe('explosionHuge')
  })

  it('keeps terrain and damage events silent', () => {
    expect(
      soundForEvent({ kind: 'terrain', tick: 0, terrain: { heights: [], dirt: [] } }, 'peashooter'),
    ).toBeNull()
  })

  it('has a sound for every audible event of every weapon', () => {
    const registry = createDefaultWeaponRegistry()
    for (const weapon of registry.all()) {
      const state = createMatch(
        {
          mode: 'practice',
          players: [
            { name: 'A', color: '#ff0000' },
            { name: 'B', color: '#0000ff' },
          ],
          seed: 1,
        },
        registry,
      )
      const slot = state.inventories[0].indexOf(weapon.id)
      const { shot } = fire(state, 0, { angle: 50, power: 60, slot }, registry)
      const audible = shot.events.filter(
        (event) => event.kind !== 'terrain' && event.kind !== 'damage',
      )
      expect(audible.every((event) => soundForEvent(event, weapon.id) !== null)).toBe(true)
    }
  })
})
