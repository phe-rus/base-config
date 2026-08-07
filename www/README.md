# baseconfig (www)

The public [baseconfig.pherus.org](https://baseconfig.pherus.org) site: the docs/marketing front end **and** the reference app for [`@baseconfig/core`](https://www.npmjs.com/package/@baseconfig/core)/[`@baseconfig/ui`](https://www.npmjs.com/package/@baseconfig/ui). Three collections (`users`, `pages`, `docs`), four globals (`topbar`, `keywords`, `category`, `storage`), email+password admin auth, deployed as a single Cloudflare Worker.

This is the **only** workspace-wired (`workspace:*`) consumer of `@baseconfig/core`/`@baseconfig/ui` in this repo, so it's also where a library change actually gets exercised end to end before anything ships; `templates/basics`/`templates/pharmacy` pin published versions instead and only pick up a change after a real release.

## Setup

```bash
bun install
# create .env.local with a real BETTER_AUTH_SECRET (no .env.example checked in, see .gitignore)
bun run local                # generate schemas + migrate a local D1
bun run dev                  # http://localhost:3000
```

Visit `/admin` and create an account, the **first** account created becomes an admin automatically. From there you can create/edit `pages`/`docs` and the `topbar`/`keywords`/`category`/`storage` globals.

## What's wired up

- `src/config/api/auth/auth.ts` / `authClient.ts`: better-auth, email+password only (`admin()` plugin).
- `src/config/base.config.ts`: the whole content model in one call: collections `users`/`pages`/`docs`, globals `topbar`/`keywords`/`category`/`storage`.
- `src/config/api/index.ts`: the whole server-side API surface in one `createHandler()` call, including the purge-on-publish `hooks` (`src/config/api/revalidate.ts`) that evict the Workers edge cache for whatever pages a write affects, see `src/lib/edge-cache.ts`.
- `vite.config.ts`: `@baseconfig/core/vite`'s `baseConfigAuto()` (edit a file under `src/config/` in dev and it regenerates the schema, migrates the local D1, and reloads automatically), plus prerendering (`/`, `/docs`, `/roadmap`) and sitemap generation with `/admin`/`/api` excluded from both.
- `wrangler.jsonc`: one D1 (`baseconfig`), one KV (`CACHE`, public-read cache), one R2 (`baseconfig`, media) binding, a custom domain route, and `assets.run_worker_first` for the prerendered page routes so they still run fresh per request instead of serving a frozen build-time snapshot.
- `e2e/smoke.spec.ts`: a Playwright smoke suite (`bun run test`) that drives a real browser against `bun run dev`, this exists specifically because this app compiles the libraries' source directly in dev, so a client-side runtime regression in `@baseconfig/core`/`@baseconfig/ui` is invisible to a typecheck or an SSR-only check.

## Scripts

- `bun run local` / `bun run remote`: regenerate schemas and migrate the local/real D1 (`bun x base gen --d1=baseconfig --local|--remote`).
- `bun run dev` / `bun run build` / `bun run preview` / `bun run deploy`: the usual Vite/Wrangler set.
- `bun run test`: the Playwright smoke suite (needs `bun run local` first and `bunx playwright install chromium` once per machine).
