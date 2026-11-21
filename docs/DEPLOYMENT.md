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

| Variable             | Default | Purpose                                    |
| -------------------- | ------- | ------------------------------------------ |
| `PORT`               | 5001    | Set by Render                              |
| `CORS_ORIGIN`        | `*`     | Allowed client origins                     |
| `RECONNECT_GRACE_MS` | 30000   | How long a dropped player keeps their seat |
| `NODE_VERSION`       | 22      | Node.js 22.12+ is required                 |

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
