# Architecture

## Packages and dependencies

```
                 ┌──────────────────────────┐
                 │  @tank-tussle/game-core │  pure TS, deterministic
                 └────────────▲─────────────┘
                              │
                 ┌────────────┴─────────────┐
                 │  @tank-tussle/protocol  │  event types + validators
                 └──────▲────────────▲──────┘
                        │            │
          ┌─────────────┴──┐   ┌─────┴────────────────────┐
          │  apps/server   │   │ @tank-tussle/client-core │  sessions, flow, renderer
          │  NestJS        │   └─────▲──────────────▲─────┘
          └───────▲────────┘         │              │
                  │          ┌───────┴───────┐ ┌────┴──────────────┐
                  └── ws ───►│  apps/client  │ │  apps/native      │
                             │  React DOM    │ │  React Native     │
                             └───────────────┘ └───────────────────┘
```

Dependencies point inwards: apps depend on packages, `client-core` depends on `protocol` and
`game-core`, `protocol` depends on `game-core`, and `game-core` depends on nothing.

## client-core

Everything a client needs that is not a view, with no DOM or React Native imports:

| Module     | Responsibility                                                                                |
| ---------- | --------------------------------------------------------------------------------------------- |
| `session/` | `GameSession` and its local / online implementations                                          |
| `network/` | `OnlineConnection`, socket factory, `CredentialsStore`                                        |
| `flow/`    | Screen reducer, match setup, session factory                                                  |
| `battle/`  | Battle controls, arsenal grouping, drag-to-aim maths, HUD helpers                             |
| `render/`  | `BattleStage` (snapshot → scene), `ShotPlayback`, `SceneRenderer` and its painters            |
| `audio/`   | `AudioService` interface, settings store, sound catalog, event → sound mapping                |
| `react/`   | Platform-free hooks (`useRoom`, `useOpenRooms`, `useSessionSnapshot`, …)                      |
| `storage/` | `KeyValueStorage`, the synchronous storage the stores are written against                     |
| `ads/`     | `AdService` interface and the `MatchAdBreaks` policy (see [MONETIZATION.md](MONETIZATION.md)) |

Platforms plug in through three small interfaces: `Canvas2D` + `LayerFactory` (drawing),
`KeyValueStorage` (persistence) and `AudioService` (sound). The web passes the browser's canvas
context, `localStorage` and Web Audio; React Native passes a Skia adapter, an AsyncStorage
cache and expo-audio.

## game-core

| Module        | Responsibility                                                      |
| ------------- | ------------------------------------------------------------------- |
| `terrain/`    | Column-height terrain: generate, carve, add dirt, surface queries   |
| `tank/`       | `TankState`, aim clamping, barrel tip / centre geometry             |
| `simulation/` | `ShotSimulator` (full shot → frames + events), `predictImpact` (AI) |
| `weapons/`    | `WeaponDefinition`, composable `ProjectileBehavior`s, standard pack |
| `match/`      | Immutable `MatchState` and rule functions; `MatchRuleError`         |
| `ai/`         | CPU aiming (search + skill-based error) and shop picks              |
| `random/`     | Seeded `Rng` (mulberry32) and seed derivation                       |

### Key decisions

- **Column terrain with two materials.** Material always settles, so each column only needs a
  height. `TerrainLayers` stores the total `heights` plus the `dirt` part on top: loose dirt
  from Mudslide slides to its angle of repose (45°) while solid ground keeps its cliffs, and
  renderers draw the two differently. States stay small and serialisable.
- **Tanks lean with the ground.** A tank rests on both track ends, so it tilts with the slope
  (max 40°). `TankState.angle` is the barrel's elevation from the hull (−8° to 188°), as on a
  real tank: when the hull leans, the barrel leans with it (world angle = tilt + elevation) and
  shells leave from the tilted turret pivot. Driving onto a slope therefore changes where the
  barrel points; the HUD shows the tilt and the resulting world angle.
- **Scoring.** `damage × closeness^1.5`, plus 50% for a blast centred on the tank (a direct
  hit). Weapon damages are tuned with a simulation over 80 maps so that a good player's average
  per shot follows the weapon's star rating (≈25 for 1★ up to ≈50 for 5★). Consecutive scoring
  shots build a combo streak (`MatchState.streaks`, up to ×1.75); a miss resets it.
- **Shots change more than terrain.** Weapons can teleport or shove tanks, steal points and
  build walls. The simulator reports this as `tank-moved` / `steal` events and final positions
  in `ShotResult.tankX` (types live in `simulation/shot-types.ts`); the client's `ShotPlayback`
  replays tank positions per tick.
- **Landscapes.** `generateTerrain` mixes fractal value noise with a feature between the tanks
  (mountain, twin peaks, mesa or canyon) and flattens a pad under each tank, so every map
  blocks direct shots but stays winnable (a level-8 CPU can reach the target on all of them).
- **Instant, deterministic shots.** `fire()` simulates the whole shot at once and returns a
  `ShotResult` (per-tick projectile frames + explosion/terrain/damage events) plus the new
  state. Renderers replay the result; rules never depend on frame rate.
- **Seeds, not random calls.** Terrain, shop and every shot use seeds derived from
  `config.seed`, so `replayShot(state, input)` reproduces the server's shot exactly.
- **Immutable state.** Rule functions take a `MatchState` and return a new one, which makes
  them trivial to test and safe to send over the network.

## Server (NestJS)

```
LobbyGateway ── create / join / start / leave / resume / disconnect
MatchGateway ── pick / aim / move / fire / rematch
   │   └── RoomBroadcaster (who gets told what)
   ├── RoomsService ── RoomRepository (port) ── InMemoryRoomRepository (adapter)
   │        └── ReconnectionTimers (grace period per seat token)
   └── MatchesService ── game-core rules
```

- Gateways parse payloads with protocol validators, resolve the caller's seat and delegate.
  They never contain rules.
- `RoomsService` owns the room lifecycle: create, join, start, leave, disconnect (keep the seat
  with a deadline), resume (rebind a seat token to a new socket) and expire. Time comes from the
  `CLOCK` token; storage sits behind the `ROOM_REPOSITORY` token, so a Redis adapter can replace
  memory without touching the service.
- Departures return a `DepartureResult` (`closed` with a reason, or `seat-freed`) so the
  gateway can notify exactly the right sockets.
- `MatchesService` keeps one authoritative `MatchState` per room and applies `game-core`
  functions. Seeds come from the `SEED_SOURCE` token (fixed in tests).
- Expected failures (`DomainError`, `MatchRuleError`, `InvalidPayloadError`) become
  `{ ok: false, error }` acknowledgements; anything else is logged.
- `ConfiguredIoAdapter` applies runtime CORS and the message size limit from `AppConfig`
  (env driven).
- `ConnectionGuardGateway` admits connections (protocol version, per-address and total caps)
  and rate-limits each socket's messages; `RoomsService` caps the number of rooms.
- `GameEventLogger` writes one searchable line per important event (rooms, matches, seats,
  refused and throttled clients) without names or tokens. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Client (React)

```
App (useGameFlow from client-core, first screen chosen by boot())
  ├── MainMenu ── Play ──► QuickMatchScreen ──► WaitingRoom (quick: starts by itself)
  │            │                └── no server / nobody comes ─► next Ladder match vs CPU
  │            ├── Ladder ──► match vs CPU level n (a win unlocks n + 1)
  │            ├── Play with a friend ──► PlayerSetup (same device) │ OnlineHub
  │            ├── Practice
  │            └── ProfileScreen (name + colour, remembered per device)
  ├── Online: OnlineHub → CreateRoom → WaitingRoom      (share code / invite link)
  │           OnlineHub ── join by code or list ─► WaitingRoom
  │           ResumeScreen (page reload with a stored seat token)
  └── MatchScreen ── GameSession (interface)
          │              ├── LocalGameSession  (rules in browser, CPU controllers)
          │              └── OnlineGameSession (rules on server)
          ├── WeaponShop
          └── Battlefield ── BattleStage ── SceneRenderer   (both from client-core)
```

- **Screen flow is shared.** `flowReducer` and the `useGameFlow` hook in `client-core` own every
  transition (menu, ladder, quick match, rooms, matches); the web and the native app only map
  each screen to their own components. The player's profile (`ProfileStore`) and ladder progress
  (`LadderStore`) are stored through `KeyValueStorage`.
- **Quick match.** `findQuickMatch` joins the first open public room or hosts a 5-weapon one.
  A quick-match host starts the match on its own as soon as a guest sits down
  (`useQuickMatchHost`) and falls back to the computer after 12 s. Because the match can start
  before the guest's screen listens, `OnlineConnection` keeps an unhandled `match:started` until
  a screen takes it.
- **`GameSession`** is the seam between UI and rules. Screens only call `pick / aim / move /
fire / completeShot / rematch` and read a `SessionSnapshot` via `useSyncExternalStore`.
- **Pending shots.** A session publishes `pendingShot` and keeps showing the pre-shot state;
  `Battlefield` animates it and calls `completeShot()`, which applies the final state. The
  same flow works for local shots, CPU shots and shots received from the server.
- **One connection per online visit.** `OnlineConnection` owns the socket from the hub to the
  end of the match, stores the seat token through a `CredentialsStore`, and re-sends
  `session:resume` after every reconnect. Screens observe it; the match session takes it over.
- **Online flow.** `OnlineGameSession` queues server updates and pauses the queue at each
  shot until its animation finishes, so late messages never skip an animation. After a resume
  it adopts the server snapshot. `presence` in the snapshot drives the "connection lost" and
  "opponent disconnected" overlays.
- **Audio.** `AudioService` (interface) is provided by `DependenciesProvider`; `WebAudioService`
  plays effects through Web Audio and streams music through one `<audio>` element, unlocking on
  the first user gesture. The engine knows nothing about sound: shots emit `launch`, `explosion`,
  `dirt` and `signal` (`bounce`, `split`) events, `Battlefield` reports them as playback reaches
  their tick, and `shot-sounds.ts` maps event + weapon to an effect. Each screen declares its
  music with `useMusic` (menu theme, waiting loop for the waiting room and weapon draft, battle loop, victory
  fanfare). Every sound is synthesised from code by `apps/client/scripts/synth-sounds.mjs`
  (`npm run sounds -w @tank-tussle/client`): effects as WAV, music as AAC — no recordings. Mute / music preferences live
  in `AudioSettingsStore` (localStorage).
- **Weapon lists.** The shop groups copies of a weapon into one card (`buildShopCatalog`):
  weapons on offer first, strongest first, sold-out ones last with who took them, and a Leave
  button that asks before ending the match; the battle picker groups the arsenal (held + `spent`) into
  selected / ready / used entries. The HUD remembers the chosen weapon by id, not by slot.
- **Aiming input.** `Battlefield` turns pointer drags into aim (`drag-aim.ts`: direction →
  elevation relative to the hull, distance → power) and wheel steps into angle/power nudges;
  `AimField` combines hold-to-repeat buttons (`useHoldRepeat`), a 0.1-step slider and a number
  field. Online aim updates are throttled to 20/s with the final value always sent.
- **Two battle layouts.** `MatchScreen` builds one `BattleViewProps` and renders `WideBattle`
  (desktop: full HUD with sliders under the field) or `CompactBattle` (phones in landscape:
  two-thumb side panels) depending on the `PHONE_SCREEN` media query (either orientation). Both compose the
  same parts (`Battlefield`, `AimField`, `MoveControl`, `WeaponPicker`, `PlayerCard`).
- **Mobile apps.** `apps/native` is a React Native app with its own views on top of
  `client-core`; `apps/mobile` holds Capacitor shells that load the built web client. See
  [MOBILE.md](MOBILE.md).
- **Invite links.** `?room=CODE` opens setup and pre-fills the code in the hub.
- **Rendering** is split into `ShotPlayback` (what is on screen at tick _n_, pure) and
  `CanvasRenderer` (how to draw a `RenderScene`). Terrain is cached in an offscreen canvas.
- **Dependencies** (weapon registry, socket factory) come from `DependenciesProvider`.

## Turn lifecycle (online)

```
client A            server                       client B
  │ match:fire ───►  validate + fire()             │
  │ ◄── ack ok       broadcast match:shot ───────► │
  │ ◄───────────── {player, input, state}          │
  │ replayShot → animate → adopt state     replayShot → animate → adopt state
```
