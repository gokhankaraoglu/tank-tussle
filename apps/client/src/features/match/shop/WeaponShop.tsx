import { buildArsenal, buildShopCatalog, type ShopEntry } from '@tank-tussle/client-core'
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
  /** Asks to leave the match (the caller confirms). */
  readonly onLeave: () => void
}

/**
 * Players take turns drafting from a fixed pool. Copies of a weapon share one card, strongest
 * weapons come first and sold-out ones move to the end, so the list stays easy to scan.
 */
export const WeaponShop = ({
  state,
  registry,
  canPick,
  onPick,
  onDealAll,
  onLeave,
}: WeaponShopProps) => {
  const picker = state.tanks[state.shop.picker]
  const catalog = buildShopCatalog(state.shop, (id) => registry.get(id))
  const picked = state.inventories[0].length + state.inventories[1].length
  const totalPicks = state.config.weaponsPerPlayer * 2

  return (
    <main className={styles.layout} style={{ ['--picker-color' as string]: picker.color }}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={onLeave} aria-label="Leave the match">
          ← Leave
        </Button>
        <div className={styles.heading}>
          <h1 className={styles.title}>Weapon Shop</h1>
          <span className={styles.turn} role="status">
            {canPick ? `${picker.name}, pick a weapon` : `Waiting for ${picker.name}…`}
            <span className={styles.progress}>
              {' '}
              · pick {Math.min(picked + 1, totalPicks)} of {totalPicks}
            </span>
          </span>
        </div>
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
        {catalog.map((entry) => (
          <li key={entry.id}>
            <ShopCard
              entry={entry}
              state={state}
              registry={registry}
              canPick={canPick}
              onPick={onPick}
            />
          </li>
        ))}
      </ul>

      <Inventory state={state} registry={registry} player={1} />
    </main>
  )
}

interface ShopCardProps {
  readonly entry: ShopEntry
  readonly state: MatchState
  readonly registry: WeaponRegistry
  readonly canPick: boolean
  readonly onPick: (poolIndex: number) => void
}

const ShopCard = ({ entry, state, registry, canPick, onPick }: ShopCardProps) => {
  const weapon = registry.get(entry.id)
  const soldOut = entry.nextSlot === null
  const owners = ([0, 1] as const).filter((player) => entry.takenBy[player] > 0)

  return (
    <button
      type="button"
      className={styles.weapon}
      data-state={soldOut ? 'taken' : 'open'}
      disabled={soldOut || !canPick}
      aria-label={`${weapon.name}, ${soldOut ? 'sold out' : `${entry.available} left`}`}
      onClick={() => entry.nextSlot !== null && onPick(entry.nextSlot)}
    >
      <span className={styles.weaponHead}>
        <WeaponIcon id={entry.id} size={42} />
        <span className={styles.weaponTitle}>
          <span className={styles.weaponName}>{weapon.name}</span>
          <span className={styles.rating} aria-hidden>
            {'★'.repeat(weapon.rating)}
            {'☆'.repeat(5 - weapon.rating)}
          </span>
        </span>
        <span className={styles.count} data-sold-out={soldOut}>
          {soldOut ? 'Sold out' : `×${entry.available}`}
        </span>
      </span>
      <WeaponTraits traits={weapon.traits} />
      <span className={styles.description}>{weapon.description}</span>
      {owners.length > 0 && (
        <span className={styles.owners}>
          {owners.map((player) => (
            <span
              key={player}
              className={styles.owner}
              style={{ ['--owner-color' as string]: state.tanks[player].color }}
            >
              {state.tanks[player].name} ×{entry.takenBy[player]}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}

interface InventoryProps {
  readonly state: MatchState
  readonly registry: WeaponRegistry
  readonly player: PlayerIndex
}

/** A player's picks so far, grouped by weapon, and how many picks are still to come. */
const Inventory = ({ state, registry, player }: InventoryProps) => {
  const tank = state.tanks[player]
  const items = state.inventories[player]
  const left = Math.max(0, state.config.weaponsPerPlayer - items.length)
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
        {buildArsenal(items, []).map(({ id, remaining }) => (
          <li key={id} className={styles.item}>
            <WeaponIcon id={id} size={24} />
            <span className={styles.itemName}>{registry.get(id).name}</span>
            {remaining > 1 && <span className={styles.itemCount}>×{remaining}</span>}
          </li>
        ))}
      </ol>
      {left > 0 && (
        <span className={styles.emptySlot}>
          {left} {left === 1 ? 'pick' : 'picks'} to go
        </span>
      )}
    </aside>
  )
}
