# pharmacy

A fuller, e-commerce-style reference app for [`@baseconfig/core`](https://www.npmjs.com/package/@baseconfig/core): `users`/`products`/`posts` collections, `keywords`/`storage` globals, email+password admin auth, deployed as a single Cloudflare Worker. A step up from `templates/basics`' minimal single-collection shape, for seeing how a product catalog and a blog coexist in the same config.

Pins `@baseconfig/core`/`@baseconfig/ui` to a published version (see `package.json`), so `bun x base gen` here runs the registry-cached library, not this monorepo's own `packages/config`/`packages/ui` source (that's `www`'s job, the only `workspace:*` consumer).

## Setup

```bash
bun install
cp .env.example .env.local   # then fill in a real BETTER_AUTH_SECRET
bun run local                # generate schemas + migrate a local D1
bun run dev                  # http://localhost:3002
```

Visit `/admin` and create an account, the **first** account created becomes an admin automatically. From there you can create/edit `products`/`posts` and the `keywords`/`storage` globals.

## What's wired up

- `src/config/api/auth/auth.ts` / `authClient.ts`: better-auth, email+password only (`admin()` plugin, no passkey/2FA/social/captcha, see `@baseconfig/core`'s own docs for how to add those back if you want them).
- `src/config/base.config.ts`: the whole content model in one call: collections `users`/`products`/`posts`, globals `keywords`/`storage`.
- `src/config/api/index.ts`: the whole server-side API surface in one `createHandler()` call. Deliberately nested under `src/config/` alongside `base.config.ts`/`collections/`/`globals/`, this app's entire own-side setup (content model *and* server wiring) lives in one place.
- `vite.config.ts`: includes `@baseconfig/core/vite`'s `baseConfigAuto()`: edit a file under `src/config/` while `bun run dev` is running and it regenerates the schema, migrates the local D1, and reloads automatically.
- `wrangler.jsonc`: D1/KV/R2 bindings. Placeholder ids, run the real `wrangler d1 create` / `wrangler kv namespace create` / `wrangler r2 bucket create` commands before deploying for real.

## Scripts

- `bun run local` / `bun run remote`: regenerate schemas and migrate the local/real D1.
- `bun run dev` / `bun run build` / `bun run preview` / `bun run deploy`: the usual Vite/Wrangler set.
