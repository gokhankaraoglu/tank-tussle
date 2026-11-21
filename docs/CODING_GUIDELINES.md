# Coding Guidelines — Clean Code & SOLID

## Style

- TypeScript `strict` with `noUncheckedIndexedAccess`; no `any`, prefer `unknown` + parsing.
- Prettier: 2 spaces, no semicolons, single quotes, trailing commas, 100 columns.
- ESM with explicit `.js` extensions in relative imports (NodeNext).
- `readonly` on public data; state objects are never mutated outside the engine internals.
- Comments explain _why_, not _what_. No commented-out code, no `console.log`.
- Files stay under ~300 lines (lint warns). Functions do one thing.

## Naming

| Item              | Convention       | Example                           |
| ----------------- | ---------------- | --------------------------------- |
| Types, classes    | PascalCase       | `MatchState`, `ShotSimulator`     |
| Functions, values | camelCase        | `pickWeapon`, `activeLocalPlayer` |
| Constant groups   | UPPER_SNAKE_CASE | `PHYSICS`, `TANK`                 |
| Files             | kebab-case       | `shot-simulator.ts`               |
| React components  | PascalCase file  | `WeaponShop.tsx`                  |
| Socket events     | `area:verb`      | `match:fire`, `lobby:join`        |

## SOLID in this codebase

### Single Responsibility

- `ShotSimulator` simulates, `ShotPlayback` decides what is visible at a tick,
  `CanvasRenderer` draws. None of them knows about the others' concerns.
- `GameGateway` is transport only; `RoomsService` is lobby rules; `MatchesService` stores state.

### Open/Closed

- Weapons are data + behaviors. Adding one never edits the simulator.
- Behaviors compose with decorators (`Bouncing`, `Homing`, `SplitAtApex` wrap another behavior).
- Player kinds are `PlayerController` variants; local game flow does not branch on mode names.

### Liskov Substitution

- `LocalGameSession` and `OnlineGameSession` are fully interchangeable behind `GameSession`.
- Every `ProjectileBehavior` honours the same contract: `onImpact` returns `destroy` or
  `continue`; optional hooks have safe defaults.

### Interface Segregation

- Behaviors receive a `SimulationContext` (explode, dig, spawn…), not the simulator.
- Read-only consumers take `TerrainView`, not the mutable `Terrain`.

### Dependency Inversion

- Server services depend on tokens (`ROOM_REPOSITORY`, `SEED_SOURCE`, `WEAPON_REGISTRY`).
- The client gets its registry and socket factory from `DependenciesProvider`; sessions take
  an injectable `Scheduler` so CPU turns are testable without timers.

## Errors

- Rule violations throw `MatchRuleError`; lobby problems throw `DomainError`; bad payloads
  throw `InvalidPayloadError`. These are expected and user-facing.
- Anything else is a bug: let it surface (server logs it and replies with a generic error).

## Tests

- Co-locate tests: `foo.ts` → `foo.test.ts`. Server e2e tests live in `apps/server/test`.
- Test behaviour through public functions; avoid testing private details.
- Engine changes must keep the "deterministic for every weapon" and "finishes within the tick
  limit" tests green.

## Commits

- Small, single-purpose commits with imperative subjects (`Add napalm weapon`).
- Keep refactors and behaviour changes in separate commits.
