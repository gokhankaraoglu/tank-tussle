/**
 * The game's look in one place: colours, corner radii, spacing and fonts. The web client turns
 * these into CSS variables at build time (`themeCss`), the React Native app reads them directly,
 * so both always match. Change a value here, never in a stylesheet.
 */
export const tokens = {
  color: {
    background: '#070b1d',
    /** Bottom of the page gradient. */
    backgroundDeep: '#03050f',
    /** Soft glow at the top of the page. */
    backgroundGlow: '#1b2470',
    elevated: '#10163a',
    card: '#161e4a',
    border: '#2a3577',
    text: '#e9ecff',
    muted: '#9aa3d6',
    accent: '#ff7849',
    accentStrong: '#ff9a6e',
    /** Text and icons on an accent-coloured background. */
    onAccent: '#1b1020',
    secondary: '#3ddcff',
    warning: '#ffd84f',
    danger: '#ff5e7a',
    success: '#6dff9e',
  },
  radius: { small: 8, medium: 14 },
  space: { xs: 4, sm: 8, md: 12, lg: 18, xl: 28 },
  font: {
    display: "'Audiowide', system-ui, sans-serif",
    body: "'Exo 2', system-ui, sans-serif",
  },
} as const

export type ColorToken = keyof typeof tokens.color

/** CSS custom property for each colour; the names predate the tokens and stay stable. */
const CSS_COLOR_NAMES: Record<ColorToken, string> = {
  background: '--bg',
  backgroundDeep: '--bg-deep',
  backgroundGlow: '--bg-glow',
  elevated: '--bg-elevated',
  card: '--bg-card',
  border: '--border',
  text: '--text',
  muted: '--text-muted',
  accent: '--accent',
  accentStrong: '--accent-strong',
  onAccent: '--on-accent',
  secondary: '--accent-2',
  warning: '--warning',
  danger: '--danger',
  success: '--success',
}

/** Every token as a CSS custom property, e.g. `--bg` or `--radius-sm`. */
export const cssVariables = (): Record<string, string> => ({
  ...Object.fromEntries(
    Object.entries(tokens.color).map(([name, value]) => [
      CSS_COLOR_NAMES[name as ColorToken],
      value,
    ]),
  ),
  '--radius': `${tokens.radius.medium}px`,
  '--radius-sm': `${tokens.radius.small}px`,
  ...Object.fromEntries(
    Object.entries(tokens.space).map(([name, value]) => [`--space-${name}`, `${value}px`]),
  ),
  '--font-display': tokens.font.display,
  '--font-body': tokens.font.body,
})

/** A `:root { … }` rule with every token, for the web client's stylesheet. */
export const themeCss = (): string =>
  `:root {\n${Object.entries(cssVariables())
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')}\n}\n`

/** `#rrggbb` plus an opacity, as `rgba(…)`, for overlays and tints. */
export const withAlpha = (hex: string, alpha: number): string => {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}
