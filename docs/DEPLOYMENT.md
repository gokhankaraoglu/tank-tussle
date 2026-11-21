# Deployment

The server and the client deploy separately, both **from the repository root**:

| Part   | Host    | Config         | URL (default)                                             |
| ------ | ------- | -------------- | --------------------------------------------------------- |
| Server | Render  | `render.yaml`  | `https://tank-tussle-server.onrender.com`                 |
| Client | Netlify | `netlify.toml` | your Netlify site, e.g. `https://tank-tussle.netlify.app` |

## Why from the root?

`apps/server` and `apps/client` depend on `@tank-tussle/game-core` and `@tank-tussle/protocol`,
which are npm workspaces, not published packages. Pointing a host at `apps/server` or
`apps/client` alone breaks the install. Both configs therefore build from the root and compile
the shared packages first (`npm run build:packages`) — their `dist/` folders are not committed.
**Change dependencies with Node 22 (npm 10).** Render and Netlify run Node 22, whose npm 10
rejects a `package-lock.json` written by npm 11 (Node 24+) with "package.json and
package-lock.json are not in sync". On a newer Node, refresh the lock with
`npx npm@10 install --package-lock-only` before committing.

The server build installs only the server's workspaces (`npm ci -w …`), so Render does not
download the web client's and the mobile app's dependencies.

## 1. Server on Render

1. Render dashboard → **New → Blueprint** → select this repository. Render reads `render.yaml`.
2. When prompted, set `CORS_ORIGIN` to the Netlify site URL (comma-separate several origins).
3. Deploy. Render injects `PORT`; the health check is `GET /health`.

| Variable                 | Default | Purpose                                                        |
| ------------------------ | ------- | -------------------------------------------------------------- |
| `PORT`                   | 5001    | Set by Render                                                  |
| `CORS_ORIGIN`            | `*`     | Allowed client origins                                         |
| `RECONNECT_GRACE_MS`     | 30000   | How long a dropped player keeps their seat                     |
| `NODE_VERSION`           | 22      | Node.js 22.12+ is required                                     |
| `LOG_LEVEL`              | `info`  | `error`, `warn`, `info` or `debug`                             |
| `TRUST_PROXY`            | `false` | `true` on Render: read the client address from X-Forwarded-For |
| `MAX_CONNECTIONS`        | 1000    | Open connections in total                                      |
| `MAX_CONNECTIONS_PER_IP` | 20      | Open connections from one address                              |
| `MAX_ROOMS`              | 300     | Rooms at the same time                                         |
| `MAX_PAYLOAD_BYTES`      | 16384   | Largest message a client may send                              |

If the service name `tank-tussle-server` is taken, Render assigns another URL — update
`VITE_SERVER_URL` in `netlify.toml` to match.

## 2. Client on Netlify

1. Netlify → **Add new site → Import an existing project** → select this repository.
   Leave base directory, build command and publish directory empty: `netlify.toml` sets them.
2. Deploy. `VITE_SERVER_URL` comes from `netlify.toml` (settings there override the UI).

`VITE_SERVER_URL` is compiled into the JavaScript bundle, so changing it requires a rebuild.
A CI build without it fails on purpose instead of shipping a client that calls localhost.

## Mobile apps

The iOS/Android apps talk to the same server. Build them with `VITE_SERVER_URL` and
`VITE_PUBLIC_URL` pointing at the deployed server and site, and add `capacitor://localhost` and
`https://localhost` to `CORS_ORIGIN`. See [MOBILE.md](MOBILE.md).

## Logs

The server writes one line per important event, so Render's **Logs** tab can be searched by
event name:

```
room.created room=59ej8r visibility=public weapons=5
match.started room=59ej8r weapons=5
seat.disconnected room=59ej8r seat=guest graceMs=30000
match.ended room=59ej8r result=host score=212-187
connection.refused reason=too-many-from-address open=20
client.throttled event=room:start
```

Rooms are identified by their code; player names and seat tokens are never logged (fields
named like `token` are redacted even if a caller passes them). Routine refusals ("not your
turn") are logged at `debug` only. Events: `room.created|joined|left|closed`,
`match.started|ended|rematch`, `seat.disconnected|resumed|resume-failed`,
`connection.refused`, `client.throttled`, `client.disconnected`, `request.rejected`,
`chat.reported`. Chat messages themselves are never logged; a reported message is logged with
its text so it can be reviewed.

## Protection against floods

What the server does itself (`apps/server/src/protection`):

- **Message size:** anything above `MAX_PAYLOAD_BYTES` is dropped before it is parsed.
- **Message rate:** every connection has a token bucket — aim updates 30/s (burst 40), other
  requests 5/s (burst 15). Throttled requests are answered with "Too many requests" instead of
  being left hanging; a client throttled 100 times is disconnected.
- **Connections:** at most `MAX_CONNECTIONS_PER_IP` per address and `MAX_CONNECTIONS` in total;
  refused connections get `SERVER_BUSY` and the client retries with back-off.
- **Rooms:** at most `MAX_ROOMS`, so a flood of room requests cannot exhaust memory.
- **Validation:** every payload goes through the protocol parsers; unknown or malformed input
  is rejected.

What it cannot do: a network-level flood (many machines, or raw traffic) has to be absorbed
before it reaches the server. Render's network sits in front of the service; for more, put the
site and the server behind Cloudflare with a custom domain and enable its rate limiting. The
per-address limit trusts the first X-Forwarded-For entry, which a client can forge; it is a
brake on simple scripts, not a security boundary.

## Things to know

- **Long-running server only.** The game uses WebSockets and in-memory rooms, so it needs a
  persistent Node process (Render, Railway, Fly.io). Serverless functions will not work.
- **One instance.** Rooms live in memory: a restart ends running games, and scaling to several
  instances needs a Redis room store plus the Socket.IO Redis adapter (see ROADMAP).
- **Free plan sleeps.** Render's free instances spin down when idle; the first visitor waits
  for a cold start and any open rooms are lost. Use a paid plan for always-on play.
- **Selective deploys.** `buildFilter` (Render) and `ignore` (Netlify) skip redeploys when only
  the other app changed.

## Verify locally

The same commands the hosts run:

```bash
npm ci --include-workspace-root -w @tank-tussle/game-core -w @tank-tussle/protocol -w @tank-tussle/server
npm run build -w @tank-tussle/game-core && npm run build -w @tank-tussle/protocol
npm run build -w @tank-tussle/server && npm start
```

```bash
VITE_SERVER_URL=http://localhost:5001 npm run build -w @tank-tussle/client && npm run preview -w @tank-tussle/client
```
