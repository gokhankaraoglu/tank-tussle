import { describe, expect, it } from 'vitest'
import { buildShopCatalog } from './shop-catalog.js'

const facts: Record<string, { name: string; rating: number }> = {
  pea: { name: 'Peashooter', rating: 1 },
  hound: { name: 'Bloodhound', rating: 5 },
  leech: { name: 'Leech', rating: 5 },
  thump: { name: 'Thumper', rating: 3 },
}
const weapon = (id: string) => facts[id]!

describe('buildShopCatalog', () => {
  it('groups copies of a weapon into one entry', () => {
    const catalog = buildShopCatalog(
      { pool: ['pea', 'thump', 'pea', 'pea'], takenBy: [0, null, null, 1] },
      weapon,
    )
    expect(catalog.find((entry) => entry.id === 'pea')).toEqual({
      id: 'pea',
      total: 3,
      available: 1,
      nextSlot: 2,
      takenBy: [1, 1],
    })
  })

  it('lists strongest first, then by name, and sold-out weapons last', () => {
    const catalog = buildShopCatalog(
      {
        pool: ['pea', 'leech', 'thump', 'hound', 'pea'],
        takenBy: [null, null, 0, null, null],
      },
      weapon,
    )
    expect(catalog.map((entry) => entry.id)).toEqual(['hound', 'leech', 'pea', 'thump'])
  })

  it('moves a weapon to the end once its last copy is taken', () => {
    const pool = ['thump', 'hound', 'pea']
    const before = buildShopCatalog({ pool, takenBy: [null, null, null] }, weapon)
    const after = buildShopCatalog({ pool, takenBy: [null, 1, null] }, weapon)
    expect(before.map((entry) => entry.id)).toEqual(['hound', 'thump', 'pea'])
    expect(after.map((entry) => entry.id)).toEqual(['thump', 'pea', 'hound'])
  })
})
