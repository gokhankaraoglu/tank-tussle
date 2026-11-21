/** Mixes a #rrggbb colour towards white (amount > 0) or black (amount < 0). */
export const shade = (hex: string, amount: number): string => {
  const value = Number.parseInt(hex.slice(1), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  const target = amount > 0 ? 255 : 0
  const mixed = channels.map((channel) =>
    Math.round(channel + (target - channel) * Math.abs(amount)),
  )
  return `rgb(${mixed.join(', ')})`
}
