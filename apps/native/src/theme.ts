import { tokens, withAlpha } from '@tank-tussle/client-core'

/**
 * The shared design tokens (packages/client-core/src/theme/tokens.ts) under the names the
 * native screens use. Change colours there, so the web and the app stay identical.
 */
export const colors = {
  background: tokens.color.background,
  elevated: tokens.color.elevated,
  card: tokens.color.card,
  border: tokens.color.border,
  text: tokens.color.text,
  muted: tokens.color.muted,
  accent: tokens.color.accent,
  accentText: tokens.color.onAccent,
  secondary: tokens.color.secondary,
  warning: tokens.color.warning,
  danger: tokens.color.danger,
  success: tokens.color.success,
  /** Dims whatever is behind a dialog. */
  scrim: withAlpha(tokens.color.backgroundDeep, 0.72),
} as const

export const radius = { small: tokens.radius.small, medium: tokens.radius.medium } as const
export const space = tokens.space

export { withAlpha }
