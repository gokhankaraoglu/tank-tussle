# Tank Tussle

An artillery duel game in TypeScript: two tanks, rolling hills, a draft of
weapons and ten shots each. Highest score wins.

- **Server:** NestJS + Socket.IO — authoritative online matches
- **Client:** React + Vite — menus, weapon shop and a canvas battlefield
- **Mobile:** a React Native app (`apps/native`) with native UI on the shared engine and renderer,
  plus Capacitor shells around the web client (`apps/mobile`) — see [docs/MOBILE.md](docs/MOBILE.md)
- **Engine:** `@tank-tussle/game-core` — deterministic, framework-free game rules shared by both

## Modes

| Menu entry         | Where the rules run | What it does                                                                            |
| ------------------ | ------------------- | --------------------------------------------------------------------------------------- |
| Play               | Server or browser   | Quick match: joins a waiting player or hosts a game; plays the computer if nobody comes |
| Ladder             | Browser             | Eight computer opponents of rising skill; each win unlocks the next                     |
| Play with a friend | Browser or server   | Take turns on one device, or host / join an online game with a code                     |
| Practice           | Browser             | Every weapon, unlimited, static target                                                  |

## Quick start

Requires Node.js 22.12+.

```bash
npm install
npm run dev          # server on :5001, client on http://localhost:5173
```

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Builds shared packages, runs server + client |
| `npm test`          | All unit and e2e tests (Vitest)              |
| `npm run typecheck` | Type-checks every workspace                  |
| `npm run lint`      | ESLint over the monorepo                     |
| `npm run build`     | Production build of everything               |
| `npm start`         | Runs the built server                        |

Configuration: copy `apps/server/.env.example` and `apps/client/.env.example` to `.env`
(`PORT`, `CORS_ORIGIN`, `RECONNECT_GRACE_MS`, `VITE_SERVER_URL`).

## Playing on a phone (web)

Open the site on a phone: the battle switches to a touch layout (two-thumb panels sideways, a
stacked layout upright). The site is an installable **PWA** — "Add to Home Screen" gives a
full-screen, landscape app, and the CPU, two-player and practice modes work offline.

## Controls

**Mouse / touch:** press and drag on the battlefield to aim — the direction sets the angle, the
distance from your tank sets the power (a dashed guide shows both). Scroll over the battlefield
to change the angle (Shift: power, Alt: 0.1 steps). Hold the −/+ buttons to repeat; they speed
up the longer you hold. Type exact values in the number fields.

**Keyboard:**

| Keys                 | Action                     |
| -------------------- | -------------------------- |
| `Q` / `E`, `←` / `→` | Rotate barrel (Shift = ×5) |
| `W` / `S`, `↑` / `↓` | Power up / down            |
| `A` / `D`            | Move (4 moves per match)   |
| `Z` / `X`            | Previous / next weapon     |
| `Space`              | Fire                       |
| `Esc`                | Leave match                |

## Repository layout

```
packages/game-core   deterministic engine: terrain, physics, weapons, match rules, CPU
packages/protocol    typed Socket.IO contract + payload validation
packages/client-core platform-free client logic: sessions, networking, flow, renderer
apps/server          NestJS: rooms, match sessions, gateway
apps/client          React: screens, sessions (local/online), canvas renderer
apps/mobile          Capacitor: native iOS and Android projects that load the client
apps/native          React Native (Expo): one native app for iOS and Android
docs/                architecture, guidelines, protocol, weapons, roadmap
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deploying to Render (server) and Netlify (client).

## License

Copyright (c) 2026 Gökhan Karaoğlu. All rights reserved. The code, graphics, sounds and music
may not be used, copied, modified or distributed without written permission; see
[LICENSE](LICENSE).
