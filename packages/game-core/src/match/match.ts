import { MATCH, SCORING, TANK, WORLD } from '../constants.js'
import { createRng, deriveSeed } from '../random/rng.js'
import { simulateShot, type ShotInput, type ShotResult } from '../simulation/shot-simulator.js'
import {
  clampAngle,
  clampPower,
  createTank,
  opponentOf,
  type PlayerIndex,
  type TankState,
} from '../tank/tank.js'
import { drive, DRIVE_STOP_MESSAGES } from '../tank/drive.js'
import { flatLayers, Terrain } from '../terrain/terrain.js'
import { generateTerrain } from '../terrain/terrain-generator.js'
import type { WeaponRegistry } from '../weapons/registry.js'
import type { WeaponId } from '../weapons/types.js'
import { MatchRuleError } from './errors.js'
import type {
  FireCommand,
  MatchConfig,
  MatchMode,
  MatchResult,
  MatchState,
  MoveDirection,
  PlayerProfile,
  ShopState,
} from './types.js'

/** Seed salts keep terrain, shop and shots on independent random streams. */
const SEED_SALT = { terrain: 0, shop: 1, shotBase: 1000, autoPickBase: 500_000 } as const

export interface CreateMatchOptions {
  readonly mode: MatchMode
  readonly players: readonly [PlayerProfile, PlayerProfile]
  readonly seed: number
  readonly weaponsPerPlayer?: number
  readonly shopSize?: number
}

export const createMatch = (options: CreateMatchOptions, registry: WeaponRegistry): MatchState => {
  const config: MatchConfig = {
    mode: options.mode,
    players: options.players,
    seed: options.seed,
    weaponsPerPlayer: options.weaponsPerPlayer ?? MATCH.weaponsPerPlayer,
    shopSize: options.shopSize ?? MATCH.shopSize,
  }
  const terrainRng = createRng(deriveSeed(config.seed, SEED_SALT.terrain))
  const shopRng = createRng(deriveSeed(config.seed, SEED_SALT.shop))
  const [first, second] = config.players

  const tanks: [TankState, TankState] = [
    createTank(first.name, first.color, terrainRng.range(70, 260), 45),
    createTank(second.name, second.color, WORLD.width - terrainRng.range(70, 260), 135),
  ]
  const terrain = flatLayers(generateTerrain(terrainRng, [tanks[0].x, tanks[1].x]))
  const isPractice = config.mode === 'practice'

  return {
    config,
    phase: isPractice ? 'playing' : 'shop',
    terrain,
    tanks,
    inventories: isPractice ? [registry.ids(), []] : [[], []],
    spent: [[], []],
    streaks: [0, 0],
    shop: createShop(isPractice ? 0 : config.shopSize, () => shopRng.pick(registry.ids())),
    turn: 0,
    shotCount: 0,
    result: null,
  }
}

const createShop = (size: number, randomWeapon: () => WeaponId): ShopState => ({
  pool: Array.from({ length: size }, randomWeapon),
  takenBy: Array.from({ length: size }, () => null),
  picker: 0,
  autoPickers: [],
})

/** Pool slots nobody has taken yet. */
export const openSlots = (shop: ShopState): number[] =>
  shop.takenBy.flatMap((owner, index) => (owner === null ? [index] : []))

export const pickWeapon = (
  state: MatchState,
  player: PlayerIndex,
  poolIndex: number,
): MatchState => {
  assertPhase(state, 'shop')
  if (state.shop.picker !== player) throw new MatchRuleError('It is not your pick')
  return resolveAutoPicks(takeFromPool(state, poolIndex))
}

/** From now on the player's picks are made at random whenever it is their turn. */
export const enableAutoPick = (state: MatchState, player: PlayerIndex): MatchState => {
  assertPhase(state, 'shop')
  if (state.shop.autoPickers.includes(player)) return state
  const autoPickers = [...state.shop.autoPickers, player]
  return resolveAutoPicks({ ...state, shop: { ...state.shop, autoPickers } })
}

/** Random draft for everyone: both arsenals are filled and the battle begins. */
export const dealAllWeapons = (state: MatchState): MatchState =>
  enableAutoPick(enableAutoPick(state, 0), 1)

/** Lets auto-pickers take their turns until a manual picker is up or the shop closes. */
const resolveAutoPicks = (state: MatchState): MatchState => {
  let current = state
  while (current.phase === 'shop' && current.shop.autoPickers.includes(current.shop.picker)) {
    const picksSoFar = current.inventories[0].length + current.inventories[1].length
    const rng = createRng(deriveSeed(current.config.seed, SEED_SALT.autoPickBase + picksSoFar))
    current = takeFromPool(current, rng.pick(openSlots(current.shop)))
  }
  return current
}

/** Moves one weapon from the pool to the current picker and advances the draft. */
const takeFromPool = (state: MatchState, poolIndex: number): MatchState => {
  const player = state.shop.picker
  const weaponId = state.shop.pool[poolIndex]
  if (weaponId === undefined) throw new MatchRuleError('That weapon is not in the shop')
  if (state.shop.takenBy[poolIndex] !== null)
    throw new MatchRuleError('That weapon is already taken')

  const inventories = withInventory(state, player, [...state.inventories[player], weaponId])
  const takenBy = state.shop.takenBy.map((owner, index) => (index === poolIndex ? player : owner))
  const shopDone = inventories.every((items) => items.length >= state.config.weaponsPerPlayer)

  return {
    ...state,
    inventories,
    shop: {
      ...state.shop,
      takenBy,
      picker: nextPicker(state, inventories, player),
    },
    phase: shopDone ? 'playing' : 'shop',
  }
}

export const aimTank = (
  state: MatchState,
  player: PlayerIndex,
  angle: number,
  power: number,
): MatchState => {
  assertPhase(state, 'playing')
  return updateTank(state, player, (tank) => ({
    ...tank,
    angle: clampAngle(angle),
    power: clampPower(power),
  }))
}

/**
 * Drives the tank on turn up to one move's distance. It stops early at walls, steep slopes and
 * cliffs; a move that cannot gain a single pixel is refused and does not use up a move.
 */
export const moveTank = (
  state: MatchState,
  player: PlayerIndex,
  direction: MoveDirection,
): MatchState => {
  assertTurn(state, player)
  const tank = state.tanks[player]
  if (tank.movesLeft <= 0) throw new MatchRuleError('No moves left')

  const route = drive(tank.x, direction, TANK.moveDistance, Terrain.fromLayers(state.terrain))
  if (route.distance === 0) {
    throw new MatchRuleError(DRIVE_STOP_MESSAGES[route.stoppedBy ?? 'edge'])
  }
  return updateTank(state, player, (current) => ({
    ...current,
    x: route.x,
    movesLeft: current.movesLeft - 1,
  }))
}

export interface FireOutcome {
  readonly state: MatchState
  readonly input: ShotInput
  readonly shot: ShotResult
  /** Extra points the shooter earned from their combo streak (already included in the state). */
  readonly comboBonus: number
}

/** Score multiplier for a player who has landed `streak` scoring shots in a row. */
export const comboMultiplier = (streak: number): number =>
  1 + SCORING.comboStep * Math.min(Math.max(0, streak), SCORING.comboMaxStreak)

export const fire = (
  state: MatchState,
  player: PlayerIndex,
  command: FireCommand,
  registry: WeaponRegistry,
): FireOutcome => {
  assertTurn(state, player)
  const weaponId = state.inventories[player][command.slot]
  if (weaponId === undefined) throw new MatchRuleError('You do not have that weapon')

  const input: ShotInput = {
    angle: clampAngle(command.angle),
    power: clampPower(command.power),
    weaponId,
  }
  const aimed = aimTank(state, player, input.angle, input.power)
  const shot = replayShot(aimed, player, input, registry)

  const isPractice = state.config.mode === 'practice'
  const inventories = isPractice
    ? state.inventories
    : withInventory(state, player, removeAt(state.inventories[player], command.slot))
  const spent = isPractice ? state.spent : withSpent(state, player, weaponId)
  // Landing shots in a row builds a combo: the streak so far multiplies this shot's points.
  const earned = shot.scoreDelta[player]
  const comboBonus =
    earned > 0 ? Math.round(earned * (comboMultiplier(state.streaks[player]) - 1)) : 0
  const streaks = [...state.streaks] as [number, number]
  streaks[player] = earned > 0 ? streaks[player] + 1 : 0

  const tanks = aimed.tanks.map((tank, index) => ({
    ...tank,
    x: shot.tankX[index] ?? tank.x,
    score: Math.max(
      0,
      tank.score + (shot.scoreDelta[index] ?? 0) + (index === player ? comboBonus : 0),
    ),
  })) as [TankState, TankState]

  return {
    input,
    shot,
    comboBonus,
    state: resolveTurn(
      {
        ...aimed,
        terrain: shot.terrain,
        tanks,
        inventories,
        spent,
        streaks,
        shotCount: state.shotCount + 1,
      },
      player,
    ),
  }
}

/**
 * Simulates a shot from a given state. Clients use this to animate shots the server resolved;
 * it uses the same seed as `fire`, so the result is identical.
 */
export const replayShot = (
  state: MatchState,
  player: PlayerIndex,
  input: ShotInput,
  registry: WeaponRegistry,
): ShotResult =>
  simulateShot({
    terrain: state.terrain,
    tanks: aimTanks(state.tanks, player, input),
    shooter: player,
    input,
    weapon: registry.get(input.weaponId),
    seed: deriveSeed(state.config.seed, SEED_SALT.shotBase + state.shotCount),
  })

const aimTanks = (
  tanks: MatchState['tanks'],
  player: PlayerIndex,
  input: ShotInput,
): MatchState['tanks'] => {
  const aimed = [...tanks] as [TankState, TankState]
  aimed[player] = { ...aimed[player], angle: input.angle, power: input.power }
  return aimed
}

/** Hands the turn over, or ends the match when nobody has ammunition left. */
const resolveTurn = (state: MatchState, shooter: PlayerIndex): MatchState => {
  if (state.config.mode === 'practice') return { ...state, turn: shooter }

  const opponent = opponentOf(shooter)
  if (state.inventories[opponent].length > 0) return { ...state, turn: opponent }
  if (state.inventories[shooter].length > 0) return { ...state, turn: shooter }
  return { ...state, phase: 'over', result: decideResult(state.tanks) }
}

const decideResult = (tanks: readonly [TankState, TankState]): MatchResult => {
  if (tanks[0].score === tanks[1].score) return 'draw'
  return tanks[0].score > tanks[1].score ? 0 : 1
}

const nextPicker = (
  state: MatchState,
  inventories: MatchState['inventories'],
  current: PlayerIndex,
): PlayerIndex => {
  const opponent = opponentOf(current)
  const opponentFull = (inventories[opponent]?.length ?? 0) >= state.config.weaponsPerPlayer
  return opponentFull ? current : opponent
}

const assertPhase = (state: MatchState, phase: MatchState['phase']): void => {
  if (state.phase !== phase) throw new MatchRuleError(`Not allowed during the ${state.phase} phase`)
}

const assertTurn = (state: MatchState, player: PlayerIndex): void => {
  assertPhase(state, 'playing')
  if (state.turn !== player) throw new MatchRuleError('It is not your turn')
}

const updateTank = (
  state: MatchState,
  player: PlayerIndex,
  update: (tank: TankState) => TankState,
): MatchState => {
  const tanks = [...state.tanks] as [TankState, TankState]
  tanks[player] = update(tanks[player])
  return { ...state, tanks }
}

const withInventory = (
  state: MatchState,
  player: PlayerIndex,
  items: readonly WeaponId[],
): MatchState['inventories'] => {
  const inventories = [...state.inventories] as [readonly WeaponId[], readonly WeaponId[]]
  inventories[player] = items
  return inventories
}

const withSpent = (
  state: MatchState,
  player: PlayerIndex,
  weaponId: WeaponId,
): MatchState['spent'] => {
  const spent = [...state.spent] as [readonly WeaponId[], readonly WeaponId[]]
  spent[player] = [...spent[player], weaponId]
  return spent
}

const removeAt = <T>(items: readonly T[], index: number): T[] => items.filter((_, i) => i !== index)
