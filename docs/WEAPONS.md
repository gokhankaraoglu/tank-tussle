# Weapons

## Model

```ts
interface WeaponDefinition {
  id: string // stable slug, e.g. 'meteor-shower' — never rename
  name: string
  description: string
  rating: 1 | 2 | 3 | 4 | 5 // used by the CPU
  traits: readonly string[] // short badges shown in the shop and picker, e.g. ['Homing']
  launch(params: LaunchParams): ProjectileSpec[]
}
```

`launch` returns the projectiles to fire. Each projectile carries a `ProjectileBehavior`
that decides what happens in flight (`onTick`) and on impact (`onImpact`).
Behaviors are created per shot, so they may keep their own state (e.g. bounces left).

## Behaviors

| Behavior          | Kind      | Used by                              |
| ----------------- | --------- | ------------------------------------ |
| `Explosive`       | base      | most weapons                         |
| `Bouncing`        | decorator | Skipstone                            |
| `Homing`          | decorator | Bloodhound                           |
| `Piercing`        | decorator | Needle                               |
| `SplitAtApex`     | decorator | Meteor Shower                        |
| `ClusterOnImpact` | base      | Popcorn, Confetti, Sparkler          |
| `ChainReaction`   | base      | Domino (uses `DelayedBlast`)         |
| `DirtBomb`        | base      | Mudslide                             |
| `Digger`          | base      | Mole                                 |
| `Teleport`        | base      | Warp — moves the shooter's tank      |
| `Knockback`       | base      | Shockwave — blast, then shoves tanks |
| `Leeching`        | base      | Leech — blast, then steals points    |
| `Airstrike`       | base      | Sky Hammer — marker, bombs from sky  |
| `WallBuilder`     | base      | Rampart — raises solid ground        |

Behaviors only use `SimulationContext`: `explode` (returns the points the shooter earned),
`dig`, `addDirt`, `award`, `spawn`, `moveTank`, `shove`, `steal`, `buildWall`, `signal`,
`tankCenter`, `terrain`, `rng`, `shooter`.

Shots can now move tanks and scores, not only terrain: the simulator emits `tank-moved` and
`steal` events, and `ShotResult.tankX` holds both tanks' final positions (`fire` applies them).

## Scoring and balance

Points per tank in a blast: `damage × closeness^1.5`, ×1.5 for a direct hit (blast centred on
the tank); hitting yourself scores for the opponent. A score never drops below 0.

**Combo streak.** Every shot that scores raises the shooter's streak; the next scoring shot is
multiplied by `1 + 0.25 × streak` (streak capped at 3, so ×1.75 at most). A miss resets it.
The HUD shows the current multiplier on the player card.

Average points per shot for a good player, without combos (`npm run balance -w
@tank-tussle/game-core`, 80 maps):

| ★   | Weapons (avg / shot)                                                                    |
| --- | --------------------------------------------------------------------------------------- |
| 5   | Bloodhound 58, Leech 43 (plus what it steals)                                           |
| 4   | Popcorn 50, Meteor Shower 49, Domino 48, Sky Hammer 47, Needle 45, Pentaburst 43        |
| 3   | Confetti 46, Thumper 45, Trident 40, Woodpecker 39, Mole 36, Skipstone 36, Shockwave 33 |
| 2   | Sparkler 32; Warp and Rampart score nothing (utility)                                   |
| 1   | Mudslide 26, Peashooter 25                                                              |

Precise weapons (Peashooter, Thumper, Leech) pay far more for perfect aim; forgiving ones
(Bloodhound, Meteor Shower) hit more often but cap lower. Leech takes half of what it earned
out of the opponent's score, so it swings a close match. Re-run the balance script after
changing damage.

## Standard pack (20)

Peashooter, Thumper, Trident, Pentaburst, Needle, Bloodhound, Skipstone, Popcorn, Confetti,
Sparkler, Meteor Shower, Domino, Mudslide, Mole, Woodpecker, Warp, Shockwave, Leech,
Sky Hammer, Rampart.

## Adding a weapon

1. Create `packages/game-core/src/weapons/standard/<weapon-id>.ts`:
   ```ts
   export const napalm: WeaponDefinition = {
     id: 'napalm',
     name: 'Napalm',
     description: 'Spreads fire along the ground.',
     rating: 4,
     traits: ['Burns'],
     launch: (params) => [launchFromBarrel(params, new MyBehavior(/* … */))],
   }
   ```
2. Add it to `STANDARD_WEAPONS` in `standard/index.ts`, and a square SVG icon at
   `apps/client/public/weapons/<weapon-id>.svg` (shown in the shop and the weapon picker).
3. If it needs new mechanics, add a behavior in `weapons/behaviors/` and export it.
4. If it should sound special, add an entry to `WEAPON_SOUNDS` in
   `apps/client/src/audio/shot-sounds.ts` (otherwise explosions pick a sound by blast size).
   Behaviors can call `context.signal('bounce' | 'split' | 'build', x, y)` for audible moments.
   A new effect is a function in `apps/client/scripts/synth/effects.mjs` plus an entry in
   `sound-catalog.ts`; run `npm run sounds -w @tank-tussle/client` to write the file.
5. Run `npm run balance -w @tank-tussle/game-core` and tune damage to the star rating.
6. Run `npm test` — the determinism and tick-limit tests cover every registered weapon.

Rules: use `params.rng` (never `Math.random`), keep ids stable, prefer composing existing
behaviors over writing new ones.
