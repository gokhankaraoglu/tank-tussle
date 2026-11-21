import type { MatchState, PlayerIndex, WeaponRegistry } from '@tank-tussle/game-core'
import { SoundControls } from '../../../audio/SoundControls.js'
import { Button } from '../../../shared/ui/Button.js'
import { WeaponIcon } from '../../../shared/weapons/WeaponIcon.js'
import { WeaponTraits } from '../../../shared/weapons/WeaponTraits.js'
import styles from './shop.module.css'

interface WeaponShopProps {
  readonly state: MatchState
  readonly registry: WeaponRegistry
  /** True when the player on pick is controlled by this device. */
  readonly canPick: boolean
  readonly onPick: (poolIndex: number) => void
  /** Deals every remaining weapon at random to both players. */
  readonly onDealAll: () => void
}

type SlotState = 'open' | 'taken'

/** Players take turns drafting from a fixed pool; taken weapons stay visible with their owner. */
export const WeaponShop = ({ state, registry, canPick, onPick, onDealAll }: WeaponShopProps) => {
  const picker = state.tanks[state.shop.picker]

  return (
    <main className={styles.layout} style={{ ['--picker-color' as string]: picker.color }}>
      <header className={styles.header}>
        <h1 className={styles.title}>Weapon Shop</h1>
        <span className={styles.turn} role="status">
          {canPick ? `${picker.name}, pick a weapon` : `Waiting for ${picker.name}…`}
        </span>
        <div className={styles.headerActions}>
          <SoundControls />
          <Button
            variant="primary"
            disabled={!canPick}
            onClick={onDealAll}
            title="Deal all remaining weapons at random to both players and start"
          >
            Random pick · deal all
          </Button>
        </div>
      </header>

      <Inventory state={state} registry={registry} player={0} />

      <ul className={styles.pool} aria-label="Weapons on offer">
        {state.shop.pool.map((id, slot) => {
          const weapon = registry.get(id)
          const owner = state.shop.takenBy[slot] ?? null
          const slotState: SlotState = owner === null ? 'open' : 'taken'
          const ownerTank = owner === null ? null : state.tanks[owner]
          return (
            <li key={slot}>
              <button
                type="button"
                className={styles.weapon}
                data-state={slotState}
                disabled={slotState === 'taken' || !canPick}
                aria-label={ownerTank ? `${weapon.name}, taken by ${ownerTank.name}` : weapon.name}
                style={ownerTank ? { ['--owner-color' as string]: ownerTank.color } : undefined}
                onClick={() => onPick(slot)}
              >
                <span className={styles.weaponHead}>
                  <WeaponIcon id={id} size={42} />
                  <span className={styles.weaponTitle}>
                    <span className={styles.weaponName}>{weapon.name}</span>
                    <span className={styles.rating} aria-hidden>
                      {'★'.repeat(weapon.rating)}
                      {'☆'.repeat(5 - weapon.rating)}
                    </span>
                  </span>
                </span>
                {ownerTank ? (
                  <span className={styles.owner}>Taken by {ownerTank.name}</span>
                ) : (
                  <>
                    <WeaponTraits traits={weapon.traits} />
                    <span className={styles.description}>{weapon.description}</span>
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <Inventory state={state} registry={registry} player={1} />
    </main>
  )
}

interface InventoryProps {
  readonly state: MatchState
  readonly registry: WeaponRegistry
  readonly player: PlayerIndex
}

/** A player's picks so far, with empty slots for the ones still to come. */
const Inventory = ({ state, registry, player }: InventoryProps) => {
  const tank = state.tanks[player]
  const items = state.inventories[player]
  const empty = Math.max(0, state.config.weaponsPerPlayer - items.length)
  const picking = state.shop.picker === player

  return (
    <aside
      className={styles.inventory}
      data-picking={picking}
      style={{ ['--owner-color' as string]: tank.color }}
    >
      <h2 className={styles.inventoryTitle}>
        {tank.name} · {items.length}/{state.config.weaponsPerPlayer}
      </h2>
      <ol className={styles.items}>
        {items.map((id, index) => (
          <li key={`${id}-${index}`} className={styles.item}>
            <WeaponIcon id={id} size={24} />
            {registry.get(id).name}
          </li>
        ))}
        {Array.from({ length: empty }, (_, index) => (
          <li key={`empty-${index}`} className={`${styles.item} ${styles.emptySlot}`}>
            <span className={styles.slotDot} />
            Empty slot
          </li>
        ))}
      </ol>
    </aside>
  )
}
