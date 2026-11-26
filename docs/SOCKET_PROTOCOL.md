# Socket Protocol

Source of truth: `packages/protocol/src` (`events.ts`, `rooms.ts`). Both sides use the typed
`ClientToServerEvents` / `ServerToClientEvents` interfaces, so a mismatch is a compile error.

Request/response events use Socket.IO acknowledgements shaped as
`Ack<T> = { ok: true, data: T } | { ok: false, error: string }`.

## Handshake

Clients connect with `auth: { protocolVersion: PROTOCOL_VERSION }`. The server refuses any other
version with the connection error `PROTOCOL_MISMATCH`; the client then stops retrying and shows
"Server version differs". Bump `PROTOCOL_VERSION` with every change to events or state shapes.

A server at its connection limits refuses with `SERVER_BUSY`; the client treats it like being
offline and retries with back-off. Requests sent faster than the per-connection rate limit
are answered with `{ ok: false, error: "Too many requests, slow down" }`.

## Room lifecycle

```
create ──► waiting ──(guest joins)──► waiting (full) ──(host: room:start)──► playing
              ▲                              │
              └──── guest leaves / drops ────┘
host leaves (waiting) ─► closed: host-left
anyone leaves (playing) ─► closed: opponent-left
disconnect ─► seat kept for RECONNECT_GRACE_MS ─► resumed, or closed: opponent-timed-out
```

A guest who drops out of a _waiting_ room simply frees the seat. Everyone else keeps their
seat during the grace period (default 30 s).

## Seats and resuming

Creating or joining returns `credentials: { roomId, token }`. The token is a secret UUID for
that seat. Clients keep it in `sessionStorage` and send `session:resume { token }`:

- automatically after Socket.IO reconnects, and
- on page load, if a token is stored.

Resuming re-binds the seat to the new socket (a second tab takes the seat over), cancels the
grace timer, tells the room via `room:updated`, and returns the room plus the current match.

## Client → Server

| Event            | Payload                  | Ack                      | Effect                                                                                                |
| ---------------- | ------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `lobby:list`     | —                        | `RoomSummary[]`          | Public, waiting rooms with an online host                                                             |
| `lobby:create`   | `{ profile, settings }`  | `Ack<RoomJoinedPayload>` | Creates a room, you are the host (0)                                                                  |
| `lobby:join`     | `{ roomId, profile }`    | `Ack<RoomJoinedPayload>` | Takes the guest seat (1)                                                                              |
| `lobby:leave`    | —                        | —                        | Leaves deliberately (see lifecycle)                                                                   |
| `room:start`     | —                        | `Ack`                    | Host only, guest must be connected                                                                    |
| `session:resume` | `{ token }`              | `Ack<ResumePayload>`     | Reclaims a seat                                                                                       |
| `match:pick`     | `{ poolIndex }`          | `Ack`                    | Draft a weapon (slot must still be free)                                                              |
| `match:deal-all` | —                        | `Ack`                    | On your pick: deal all remaining weapons at random to both players                                    |
| `match:aim`      | `{ angle, power }`       | —                        | Live aim, relayed to the opponent                                                                     |
| `match:move`     | `{ direction: -1 \| 1 }` | `Ack`                    | Spend a move; rejected if a wall, steep slope or cliff blocks the way                                 |
| `match:fire`     | `{ angle, power, slot }` | `Ack`                    | Resolve a shot                                                                                        |
| `match:rematch`  | —                        | —                        | Vote for a rematch                                                                                    |
| `chat:send`      | `{ text }` (1–200 chars) | `Ack`                    | Chat line to everyone in your room; profanity is masked, max one message every 2 s after a burst of 4 |
| `chat:report`    | `{ messageId }`          | `Ack`                    | Report the opponent's message; the server logs its real text as `chat.reported`                       |

- `profile`: `{ name: 1–16 chars, color: '#rrggbb' }`. A guest whose colour matches the host's
  gets the next free palette colour.
- `poolIndex`: index into `state.shop.pool`, which never shrinks; `state.shop.takenBy[i]` says
  who took each slot.
- `settings`: `{ visibility: 'public' | 'private', weaponsPerPlayer: 5 | 10 | 15 }`
- `roomId`: 6 characters, case-insensitive, no ambiguous characters (0/o, 1/l/i)

## Server → Client

| Event                     | Payload                        | When                                                     |
| ------------------------- | ------------------------------ | -------------------------------------------------------- |
| `lobby:rooms`             | `RoomSummary[]`                | The public list changed                                  |
| `room:updated`            | `{ room: RoomView }`           | Seat taken/freed, connection lost/regained, game started |
| `room:closed`             | `{ reason }`                   | `host-left`, `opponent-left`, `opponent-timed-out`       |
| `match:started`           | `{ state, you }`               | Match or rematch starts                                  |
| `match:state`             | `{ state }`                    | After a pick or move                                     |
| `match:aimed`             | `{ player, angle, power }`     | Opponent aims                                            |
| `match:shot`              | `{ player, input, state }`     | A shot was resolved                                      |
| `match:rematch-requested` | `{ player }`                   | One player voted for a rematch                           |
| `chat:message`            | `{ id, player, text, sentAt }` | A player in the room sent a chat line (already filtered) |

`RoomView` seats carry `connected` and `reconnectDeadline` (epoch ms), which clients use for
the "waiting for opponent" countdown.

## Shots

The server runs `fire()` and broadcasts the shot `input` plus the resulting `state`.
Clients call `replayShot(previousState, player, input)` to get identical frames for animation,
then adopt the server `state`. Shot frames never cross the network.

## Validation

Every payload is parsed on the server with `parse*` functions from `@tank-tussle/protocol`.
Invalid input is rejected with `{ ok: false, error }` and never reaches game logic.
