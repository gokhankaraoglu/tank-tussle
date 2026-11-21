/** Tank colours players can choose from. Shared so the server can resolve clashes. */
export const PLAYER_COLORS: readonly { readonly name: string; readonly value: string }[] = [
  { name: 'Orange', value: '#ff7849' },
  { name: 'Cyan', value: '#3ddcff' },
  { name: 'Lime', value: '#a3ff4f' },
  { name: 'Magenta', value: '#ff4fd8' },
  { name: 'Yellow', value: '#ffd84f' },
  { name: 'Violet', value: '#9b7bff' },
]

export const DEFAULT_COLORS = ['#ff7849', '#3ddcff'] as const

/** Keeps the wanted colour unless it is taken; then the first free palette colour. */
export const distinctColor = (wanted: string, taken: string): string => {
  if (wanted.toLowerCase() !== taken.toLowerCase()) return wanted
  return (
    PLAYER_COLORS.find((color) => color.value.toLowerCase() !== taken.toLowerCase())?.value ??
    wanted
  )
}
