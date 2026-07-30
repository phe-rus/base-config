<p align="center">
  <img src="./screenshot/baseConfig.png" alt="baseConfig" />
</p>

<h1 align="center">baseConfig</h1>

A config-driven CMS engine for TanStack Start, built edge-first for **one Cloudflare Worker** — no separate Node server, no separate database. Hono for routing, Drizzle over D1 for content, R2 for media, and a genuinely **local-first admin UI**: editing a document never touches the network until you explicitly publish.

This repo is a Bun workspace of the three packages that make up baseConfig:

| Package | Readme |
| --- | --- |
| [`@baseconfig/core`](./config) | [config/README.md](./config/README.md) |
| [`@baseconfig/ui`](./ui) | [ui/README.md](./ui/README.md) |
| [`@baseconfig/plugin-form-builder`](./plugin-form-builder) | [plugin-form-builder/README.md](./plugin-form-builder/README.md) |

## Screenshots

<p align="center">
<img src="./screenshot/baseconfig.png" alt="Admin dashboard listing every registered collection and global" height="220" />
<img src="./screenshot/baseconfig-page.png" alt="Editing a page's hero block, with the meta fields tab visible" height="220" />
<img src="./screenshot/baseconfig-storage.png" alt="Storage page browsing an R2-backed folder of uploaded media" height="220" />
<img src="./screenshot/baseconfig-blocks.png" alt="Picking a page-content block to add to a document" height="220" />
<img src="./screenshot/baseconfig-posts.png" alt="Editing an unpublished draft document, with Discard draft / Publish actions" height="220" />
</p>

## Quick start

```bash
bun add @baseconfig/core @baseconfig/ui hono drizzle-orm better-auth
```

```ts
// base.config.ts — one call describes your whole app
import { baseConfig, defineCollection, defineGlobal } from '@baseconfig/core'

const posts = defineCollection({
	slug: 'posts',
	tabs: [
		{ id: 'content', fields: [{ type: 'text', name: 'title' }, { type: 'richtext', name: 'body' }] }
	]
})

const footer = defineGlobal({
	slug: 'footer',
	fields: [{ type: 'menu', name: 'links' }]
})

export default baseConfig({
	hostDomain: 'https://example.com',
	queryClient,
	auth: authClient, // better auth client
	config: { adminPath: 'admin' },
	collections: [posts],
	globals: [footer]
})
```

```ts
// api entry — the whole server-side surface is one call
import { createHandler } from '@baseconfig/core/api'

export default createHandler({
	db: drizzle(env.BASECONFIG),
	auth, // a betterAuth server, instance
	bindings: { r2: env.MEDIA, kv: env.CACHE, isdev: env.ENVIRONMENT === 'development' }
})
```

That's it — content CRUD (`/api/<collection>`, `/api/globals/<slug>`), the media library (`/api/storage/*`), and public unauthenticated media serving (`/api/cdn/*`) are all mounted for you. See [`config/CLAUDE.md`](./config/CLAUDE.md) and [`ui/CLAUDE.md`](./ui/CLAUDE.md) for the full internals.

## Development

```bash
bun install
bun run dev        # tsdown --watch across all three packages
bun run build       # tsdown build, real dist output
bun run typecheck   # tsc --noEmit per package
```

Every package builds to `dist/` via [tsdown](https://tsdown.dev) (rolldown-based) — nothing runs against raw `src/` at runtime. `dependencies`/`peerDependencies` are deliberately split by "does this package really need its own copy" (`neverBundle`) vs "should this get inlined" (`alwaysBundle`) — see each package's own `tsdown.config.ts`.

## Features

- **Config-driven collections & globals** — `defineCollection`/`defineGlobal`, one call (`baseConfig({...})`) describes your whole app's content model.
- **~20 field types** — text, textarea, richtext, checkbox, switch, date, keywords, upload, select, radio, email, number, password, code, json, slug, point, array, blocks, relationship, relations, meta, menu, links, plus layout-only row/collapsible/group/tabs/ui — and growing.
- **Real content persistence** — one D1 table generated per collection/global, raw SQL, a real Hono REST API (`/api/<collection>`, `/api/globals/<slug>`).
- **Local-first admin editing** — every keystroke writes to `localStorage` only; the network is touched exactly once, on Publish. Drafts survive a reload and show up in the list with a "Draft" badge even before they're ever published.
- **A real, R2-backed media library** — folder browsing, per-collection/per-document upload scoping, and a public, unauthenticated, two-layer-cached `/api/cdn/*` route for serving files back out.
- **Auth via [better-auth](https://better-auth.com)** — passkeys, 2FA, social sign-in, username auth, and admin roles all come for free by delegating to a real, actively maintained auth library instead of reinventing one.
- **A full admin UI shell** — dashboard, collection list/table, a tabbed document editor, a Tiptap v3 rich text editor, a block-based page builder (richtext/media/cta/banner/grid/code/relatedPosts blocks), nav menu + link field composites, and an SEO meta fields composite.
- **A real plugin mechanism** — `endpointFactories`/`hooks`/`blocks` registration, proven out by [`@baseconfig/plugin-form-builder`](./plugin-form-builder) (a forms/form-submissions collection pair plus a public contact-form block).
- **One Cloudflare Worker** — content, media, admin UI, and your public site all deploy together; no separate Node server, no separate database service.
- **Edge caching where it counts** — the CDN route caches at both the browser (`Cache-Control`) and the Workers edge (`caches.default`) layers.

## Roadmap

An honest list of what's not there yet, roughly in priority order:

- [ ] **Real per-field/per-document access control** — today it's one blunt gate (`role === 'admin'`) for all writes.
- [ ] **Deep-field querying** — `where` clauses currently only reach top-level columns (`status`/`slug`), not into a document's own JSON `data`. This is the single biggest daily-use gap, and blocks a `join` field type too.
- [ ] **A generic, registry-driven relationship picker** — today it's three hardcoded `useLiveQuery` calls, not derived from the collection registry, so a plugin-registered collection isn't relatable yet.
- [ ] **KV edge-cache for content reads** — the CDN route already has this; `/api/<collection>` reads still hit D1 directly every time.
- [ ] **Image variants/focal point** for uploads — currently one file in, one URL out, no resizing.
- [ ] **Server-side version history and scheduled publish** — local-first drafting solves "don't lose my work," not "what did this look like last week" or "publish this at 9am."
- [ ] **A wider plugin surface** — the current registration hooks cover what the form-builder plugin needs; a real plugin ecosystem needs more surface area than that.
- [ ] **Localization (i18n)** and **live preview** — neither exists yet.

Contributions on any of these — or on anything else in the field/admin-UI vocabulary — are genuinely welcome; see below.

## Contributing

Issues and PRs are welcome. To get set up:

```bash
git clone git@github.com:phe-rus/base-config.git
cd base-config
bun install
bun run dev
```

- Formatting/linting is [Biome](https://biomejs.dev) (`bunx biome check .` / `bunx biome format --write .`).
- Each package typechecks standalone (`bun run typecheck`, from the package or the repo root via `turbo`).
- Keep `dependencies` vs `peerDependencies` honest: anything the package actually imports at runtime (not just types) should be a real `dependency`, since the isolated linker doesn't resolve peers for a package's own standalone build.

## License

[MIT](./LICENSE)

## 👏 Thanks to all our contributors

<img align="center" src="https://contributors-img.web.app/image?repo=phe-rus/base-config"/>