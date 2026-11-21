import { describe, expect, it } from 'vitest'
import { cssVariables, themeCss, tokens, withAlpha } from './tokens.js'

describe('design tokens', () => {
  it('are all valid #rrggbb colours', () => {
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('give every colour its own CSS variable', () => {
    const variables = cssVariables()
    const colourVariables = Object.entries(variables).filter(([, value]) => value.startsWith('#'))
    expect(colourVariables).toHaveLength(Object.keys(tokens.color).length)
    expect(variables['--bg']).toBe(tokens.color.background)
    expect(variables['--accent-2']).toBe(tokens.color.secondary)
    expect(variables['--radius-sm']).toBe('8px')
  })

  it('renders a :root rule for the stylesheet', () => {
    const css = themeCss()
    expect(css.startsWith(':root {')).toBe(true)
    expect(css).toContain(`  --accent: ${tokens.color.accent};`)
  })

  it('adds opacity to a colour', () => {
    expect(withAlpha('#3ddcff', 0.14)).toBe('rgba(61, 220, 255, 0.14)')
  })
})
