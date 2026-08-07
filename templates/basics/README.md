# basics

A minimal, working reference app for [`@baseconfig/core`](https://www.npmjs.com/package/@baseconfig/core): `users`/`posts` collections, `keywords`/`storage` globals, email+password admin auth, deployed as a single Cloudflare Worker. No plugins, no extra sign-in methods, just enough to see the whole stack working end to end.

This is also the library's own dev/test bed now: changes to `@baseconfig/core`/`@baseconfig/ui` get tried out here before anything else.

## Setup

```bash
bun install
cp .env.example .env.local   # then fill in a real BETTER_AUTH_SECRET
bun run local                # generate schemas + migrate a local D1
bun run dev                  # http://localhost:3000
```

Visit `/admin` and create an account, the **first** account created becomes an admin automatically. From there you can create/edit `posts` and the `keywords`/`storage` globals.

## What's wired up

- `src/config/api/auth/auth.ts` / `authClient.ts`: better-auth, email+password only (`admin()` plugin, no passkey/2FA/social/captcha, see `@baseconfig/core`'s own docs for how to add those back if you want them).
- `src/config/base.config.ts`: the whole content model in one call: collections `users`/`posts`, globals `keywords`/`storage`.
- `src/config/api/index.ts`: the whole server-side API surface in one `createHandler()` call. Deliberately nested under `src/config/` alongside `base.config.ts`/`collections/`/`globals/`, this app's entire own-side setup (content model *and* server wiring) lives in one place.
- `vite.config.ts`: includes `@baseconfig/core/vite`'s `baseConfigAuto()`: edit a file under `src/config/` while `bun run dev` is running and it regenerates the schema, migrates the local D1, and reloads automatically.
- `wrangler.jsonc`: one D1 (`DB`), one KV (`CACHE`, public-read cache), one R2 (`MEDIA`) binding. Placeholder ids, run the real `wrangler d1 create` / `wrangler kv namespace create` / `wrangler r2 bucket create` commands before deploying for real.

## Scripts

- `bun run local` / `bun run local --skip-auth`: regenerate schemas and migrate the local D1 (the latter skips the `auth:gen` step, useful when only the content schema changed).
- `bun run remote`: same, then a confirmation-gated migration against the real remote D1.
- `bun run dev` / `bun run build` / `bun run preview` / `bun run deploy`: the usual Vite/Wrangler set.
