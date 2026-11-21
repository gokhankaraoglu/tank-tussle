/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { cssVariables, tokens } from '@tank-tussle/client-core'
import { describe, expect, it } from 'vitest'

// Read from disk: Vitest does not process CSS, so `?raw` imports come back empty.
const tailwindCss = readFileSync(new URL('./tailwind.css', import.meta.url), 'utf8')

describe('Tailwind theme', () => {
  it('offers every shared colour token, and only those', () => {
    const colourVariables = Object.entries(cssVariables())
      .filter(([, value]) => Object.values<string>(tokens.color).includes(value))
      .map(([name]) => name)
    for (const name of colourVariables) {
      expect(tailwindCss, `${name} is missing from tailwind.css`).toContain(`var(${name})`)
    }
    expect(tailwindCss).toContain('--color-*: initial;')
  })
})
