# Roadmap

## Done

- Four modes: CPU (8 levels), hot-seat, online rooms, practice
- Alternating weapon draft (20-weapon pool, 10 each), 4 moves per match, self-hit scoring
- 20 original weapons with SVG icons and trait badges, built from composable behaviors —
  including utility weapons (Warp teleport, Shockwave knockback, Leech point steal, Sky Hammer
  airstrike, Rampart wall)
- Menu built around one-tap play: quick match with computer fallback, an 8-rung ladder against
  the computer, "play with a friend" (same device or online), a remembered player profile
- Combo streak: consecutive scoring shots multiply the next one (up to ×1.75)
- Online play with an authoritative server, rematch and opponent-left handling
- Public/private rooms with codes and invite links, host-started matches, match length setting
- Reconnection: seats survive drops and page reloads for a grace period
- Visual weapon picker with icons and used/remaining states, one-click random deal for the whole draft, 0.1-precision power
- Detailed tanks that lean with the slope; barrel range depends on the tilt
- Accuracy-based scoring with direct-hit bonus; weapon damages balanced by simulation
- Harder landscapes (mountain, twin peaks, mesa, canyon) and loose dirt that slides
- Mobile web: touch layout for both orientations, installable offline PWA, fullscreen button
- iOS and Android apps (Capacitor) with a two-thumb landscape layout for phones
- React Native app (`apps/native`) with native UI; logic and renderer shared through
  `packages/client-core`
- Audio: original, code-generated menu/waiting/battle/victory music and per-weapon effects (25),
  mute (M) and music toggles

## Planned

| Area    | Item                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Weapons | More ideas: napalm, laser, crawler that follows the ground, wind-affected shells                           |
| Audio   | Volume sliders; gapless music loops (AAC leaves a few ms of silence at the loop point)                     |
| Visuals | Animated dirt slides, off-screen shell indicator                                                           |
| Modes   | Daily challenge (same seed for everyone), online rating and weekly leaderboard (needs accounts)            |
| UX      | Settings (volume, full screen); mobile: deep links for invites, share sheet, haptics, tablet layout        |
| Online  | Reconnect to a running match, room codes for private games, Redis room store for multiple server instances |
| Quality | React component tests, Playwright smoke test, CI workflow                                                  |
