# AGENTS.md

Guide for AI coding agents and developers working in this repository.

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — packages, data flow, key decisions
- [docs/CODING_GUIDELINES.md](docs/CODING_GUIDELINES.md) — Clean Code and SOLID rules (mandatory)
- [docs/SOCKET_PROTOCOL.md](docs/SOCKET_PROTOCOL.md) — online events and payloads
- [docs/WEAPONS.md](docs/WEAPONS.md) — weapon system and how to add a weapon
- [docs/ROADMAP.md](docs/ROADMAP.md) — what is done and what is planned
- [docs/MOBILE.md](docs/MOBILE.md) — iOS/Android: the React Native app, the Capacitor shells, phone layout, running on devices
- [docs/MONETIZATION.md](docs/MONETIZATION.md) — ads between matches: `AdService`, policy, network setup
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Render + Netlify; always build from the repo root

## Stack

npm workspaces monorepo, TypeScript 5.9 (strict), ESM everywhere, Vitest for all tests.

| Workspace              | Tech                                                  |
| ---------------------- | ----------------------------------------------------- |
| `packages/game-core`   | Pure TypeScript, no DOM/Node APIs                     |
| `packages/protocol`    | Types + validators                                    |
| `packages/client-core` | Platform-free client logic (sessions, flow, renderer) |
| `apps/server`          | NestJS 12, Socket.IO 4                                |
| `apps/client`          | React 19, Vite 8, Canvas 2D                           |
| `apps/mobile`          | Capacitor 8 (iOS via SPM, Android)                    |
| `apps/native`          | React Native 0.81, Expo 54, Skia                      |

## Commands

```bash
npm install
npm run dev         # server :5001 + client :5173
npm test            # must pass before finishing a task
npm run typecheck
npm run lint
```

Use Node 22 (`.nvmrc`) when adding or updating dependencies: the hosts run npm 10, which
rejects a lock file written by npm 11 (`npx npm@10 install --package-lock-only` fixes it).

Shared packages are consumed from `dist/` by the server. `npm run dev` rebuilds them on change
and restarts the server; outside `dev`, run `npm run build:packages` after changing them (the
root `test` and `typecheck` scripts do this for you). Bump `PROTOCOL_VERSION` whenever events or
state shapes change, so an outdated server is refused instead of sending state the client
cannot draw.
The client aliases them to `src/` for hot reload.

## Rules of the house

1. **Game rules live only in `game-core`.** Server and client never re-implement physics,
   scoring or turn logic; they call `createMatch`, `pickWeapon`, `aimTank`, `moveTank`, `fire`,
   `replayShot`.
2. **The engine is presentation-free.** No sound or drawing in `game-core`; it emits shot
   events (`launch`, `explosion`, `dirt`, `signal`…) and the client decides how they look and
   sound (`packages/client-core/src/audio/shot-sounds.ts`). Sound files live in `apps/client/public/sounds`
   and are generated: edit `apps/client/scripts/synth/*.mjs` and run `npm run sounds -w @tank-tussle/client`
   instead of adding recordings.
3. **The engine is deterministic.** No `Math.random()` or `Date.now()` inside `game-core`;
   use the seeded `Rng`. A change that alters simulation output must keep
   `simulateShot` deterministic (there is a test for every weapon).
4. **The server is authoritative online.** Clients send intents; the server validates with
   `@tank-tussle/protocol` parsers, applies them through `game-core` and broadcasts state.
5. **Protocol changes are contract changes.** Update `packages/protocol`, server, client and
   `docs/SOCKET_PROTOCOL.md` together.
6. **Seats survive disconnects.** Never close a room on `disconnect` directly; go through
   `RoomsService.disconnect` / `expire` so the grace period and `session:resume` keep working.
7. **Depend on abstractions.** UI talks to `GameSession`, not to sockets; server services get
   storage and seeds through injection tokens (`ROOM_REPOSITORY`, `CLOCK`, `SEED_SOURCE`, `WEAPON_REGISTRY`); the client gets them from
   `DependenciesProvider` (`CredentialsStore`, `openConnection`, `AudioService`).
8. **Extend, don't modify.** New weapon → new file + one line in the pack list. New mode →
   new `PlayerController` / `GameSession` implementation, not `if (mode === …)` chains.
9. **One client core for web and native.** Everything that is not a view lives in
   `packages/client-core`: sessions, networking, screen flow, shot playback, sound mapping and
   the battlefield painters (drawn through the `Canvas2D` interface). `apps/client` (DOM) and
   `apps/native` (React Native) only add views and platform adapters (storage, audio, canvas);
   never copy logic into an app, and never import DOM or React Native APIs in `client-core`.
   `apps/mobile` only wraps the built web client. Phone-specific web UI lives in the client
   behind the `PHONE_SCREEN` media query; shell-only behaviour goes through `shared/platform.ts`.
   Every screen must work on a 667×320 landscape and a 360×640 portrait viewport, respect
   safe-area insets, and keep hover styles inside `@media (hover: hover)`.
10. Style: 2 spaces, no semicolons, single quotes, 100 columns (Prettier). Files under ~300 lines.
11. Every bug fix or rule change comes with a test next to the code (`*.test.ts`).
