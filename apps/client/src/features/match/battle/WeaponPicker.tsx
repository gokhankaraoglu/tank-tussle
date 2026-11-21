import type { WeaponId, WeaponRegistry } from '@tank-tussle/game-core'
import { useEffect, useRef, useState } from 'react'
import { WeaponIcon } from '../../../shared/weapons/WeaponIcon.js'
import { WeaponTraits } from '../../../shared/weapons/WeaponTraits.js'
import { buildArsenal, type ArsenalEntry } from '@tank-tussle/client-core'
import styles from './hud.module.css'

interface WeaponPickerProps {
  readonly inventory: readonly WeaponId[]
  readonly spent: readonly WeaponId[]
  readonly registry: WeaponRegistry
  readonly slot: number
  readonly unlimited: boolean
  /** False while it is not this device's turn: the list can be viewed but not changed. */
  readonly canSelect: boolean
  /** Short button and a centred list, for the phone layout's top bar. */
  readonly compact?: boolean
  readonly onSelect: (slot: number) => void
}

type EntryState = 'selected' | 'ready' | 'used'

const entryState = (entry: ArsenalEntry, selectedId: WeaponId | undefined): EntryState => {
  if (entry.remaining === 0) return 'used'
  return entry.id === selectedId ? 'selected' : 'ready'
}

/** The selected weapon, plus a visual list of the whole arsenal with what is left and used. */
export const WeaponPicker = ({
  inventory,
  spent,
  registry,
  slot,
  unlimited,
  canSelect,
  compact = false,
  onSelect,
}: WeaponPickerProps) => {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selectedId = inventory[slot]
  const selected = selectedId ? registry.get(selectedId) : null
  const arsenal = buildArsenal(inventory, spent)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  const choose = (entry: ArsenalEntry) => {
    if (entry.nextSlot === null) return
    onSelect(entry.nextSlot)
    setOpen(false)
  }

  const summary = unlimited
    ? 'Practice · all weapons'
    : `${inventory.length} left · ${spent.length} used`

  return (
    <div className={styles.picker} data-compact={compact} ref={root}>
      <button
        type="button"
        className={styles.pickerButton}
        aria-haspopup="true"
        aria-expanded={open}
        title={selected?.description}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedId ? (
          <WeaponIcon id={selectedId} size={compact ? 28 : 40} />
        ) : (
          <span className={styles.emptyIcon} />
        )}
        <span className={styles.pickerText}>
          <span className={styles.weaponName}>{selected?.name ?? 'Out of ammo'}</span>
          <span className={styles.muted}>{summary}</span>
        </span>
        <span aria-hidden className={styles.caret}>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className={styles.arsenal} role="dialog" aria-label="Your weapons">
          <p className={styles.arsenalHeader}>
            {canSelect ? 'Choose a weapon' : 'Your weapons — wait for your turn to choose'}
          </p>
          <ul className={styles.arsenalGrid}>
            {arsenal.map((entry) => {
              const weapon = registry.get(entry.id)
              const state = entryState(entry, selectedId)
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={styles.arsenalItem}
                    data-state={state}
                    aria-pressed={state === 'selected'}
                    disabled={!canSelect || state === 'used'}
                    title={weapon.description}
                    onClick={() => choose(entry)}
                  >
                    <WeaponIcon id={entry.id} size={42} />
                    <span className={styles.arsenalName}>{weapon.name}</span>
                    <WeaponTraits traits={weapon.traits} />
                    <span className={styles.badge}>{badgeText(entry, unlimited, state)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

const badgeText = (entry: ArsenalEntry, unlimited: boolean, state: EntryState): string => {
  if (unlimited) return state === 'selected' ? 'Selected' : '∞'
  if (state === 'used') return 'Used'
  const total = entry.remaining + entry.used
  return total > 1
    ? `${entry.remaining}/${total} left`
    : state === 'selected'
      ? 'Selected'
      : 'Ready'
}
