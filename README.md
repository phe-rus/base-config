# baseConfig

A config-driven, TanStack-Start-native CMS engine built for **one Cloudflare Worker** — no separate Node server, no separate database service. Payload-inspired in shape (`defineCollection`/`defineGlobal`, Local-API-style client naming, a generated REST surface), but built edge-first from the ground up: Hono for routing, Drizzle over D1 for content, R2 for media, and a genuinely **local-first admin UI** — editing a document never touches the network until you explicitly publish.

This repo is a Bun workspace of the three packages that make up baseConfig:

| Package | What it is |
| --- | --- |
| [`@base/config`](./config) | The engine itself — field vocabulary, schema deriver, content persistence (D1), the Hono API layer, and the full admin UI shell. |
| [`@base/ui`](./ui) | The sibling primitive library — vendored shadcn/base-ui components, a tiptap v3 rich text editor, and the `useAppForm`-based form field system `@base/config` renders every field through. |
| [`@base/plugin-form-builder`](./plugin-form-builder) | A real plugin built on baseConfig's extension points — a `forms`/`form-submissions` collection pair plus a public contact-form block that posts straight to a generated endpoint. |

## Screenshots

| Dashboard | Document editor |
| --- | --- |
| ![Admin dashboard listing every registered collection and global](./screenshot/baseconfig.png) | ![Editing a page's hero block, with the meta fields tab visible](./screenshot/baseconfig-page.png) |

| Media library | Block picker |
| --- | --- |
| ![Storage page browsing an R2-backed folder of uploaded media](./screenshot/baseconfig-storage.png) | ![Picking a page-content block to add to a document](./screenshot/baseconfig-blocks.png) |

| Draft-aware document editing |
| --- |
| ![Editing an unpublished draft document, with Discard draft / Publish actions](./screenshot/baseconfig-posts.png) |

## Quick start

```bash
bun add @base/config @base/ui hono drizzle-orm
```

```ts
// base.config.ts — one call describes your whole app
import { baseConfig, defineCollection, defineGlobal } from '@base/config'

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
	auth: authClient,
	config: { adminPath: 'admin' },
	collections: [posts],
	globals: [footer]
})
```

```ts
// api entry — the whole server-side surface is one call
import { createHandler } from '@base/config/api'

export default createHandler({
	db: drizzle(env.BASECONFIG),
	auth, // a betterAuth() instance
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

## How this compares to Payload CMS

`@base/config` borrows Payload's shape on purpose — `defineCollection`/`defineGlobal`, a REST surface shaped like Payload's own, Local-API-style client method names (`find`/`findByID`/`create`/`update`) — because that shape is a good one, not because the goal is to be a drop-in replacement. The two projects optimize for different deployments: Payload targets a long-running Node server (commonly paired with Next.js) with a very deep, mature feature set built up over years; `@base/config` targets a single Cloudflare Worker, trading some of that depth for an edge-native runtime and a genuinely local-first editing model Payload doesn't have.

| Area | Payload CMS | `@base/config` | Status |
| --- | --- | --- | --- |
| Collections & globals | ✅ | ✅ | Parity |
| Field vocabulary | ~30 types, incl. virtual `join` | ~20 types — text/textarea/richtext/checkbox/switch/date/keywords/upload/select/radio/email/number/password/code/json/slug/point/array/blocks/relationship/relations/meta/menu/links, plus layout-only row/collapsible/group/tabs/ui | Partial — deliberately smaller, growing |
| Access control | Fine-grained, per-field/per-collection/per-operation access functions | One blunt gate: `session.user.role === 'admin'` for all writes | **Gap** |
| Lifecycle hooks | `beforeChange`/`afterChange`/`beforeRead`/`afterRead`/`beforeValidate`/`beforeDelete`/`afterDelete`/`afterOperation`, per collection | Two-tier `CollectionHooks` (isomorphic + binding-capable), less granular | Partial |
| Versions & drafts | Full version history, autosave, scheduled publish | Local-first `localStorage` draft + explicit Publish — no server-side version history, no autosave, no scheduling | Different model, not a strict subset |
| Live Preview | ✅ | ❌ | **Missing** |
| Localization (i18n) | Built-in, per-field | None | **Missing** |
| Rich text | Lexical | Tiptap v3 | Both, different engine |
| Media/uploads | Image resizing, multiple sizes, focal point + crop UI | R2-backed storage, per-collection/document folder scheme, two-layer edge caching — no resizing or focal point | Partial |
| REST API | ✅ (+ GraphQL) | ✅ (Hono, Payload-shaped routes) | GraphQL **missing** |
| Local API | Real in-process server call, no HTTP round-trip | `base` client — same naming/ergonomics, but goes through the same RPC path as the browser | Different (name matches, mechanism doesn't) |
| Auth | Built-in (JWT, API keys) | Delegates entirely to [better-auth](https://better-auth.com) — passkeys, 2FA, social sign-in, username auth, admin roles all come along for free | Different — arguably richer via delegation |
| Query language | Rich `where` DSL across nested fields | Top-level columns only (`status`/`slug`, `equals`) — no querying into a document's own JSON data | **Gap** |
| Relationships | Polymorphic, dynamic across all collections | `hasMany`/single, but the picker's own collection list is hand-written (three `useLiveQuery` calls), not derived from the registry | Partial — real, disclosed gap |
| `join` field | ✅ | Not implemented — deliberately deferred (needs real query-layer support first) | **Missing** |
| Plugin system | Deep — plugins can extend nearly every layer | Narrow: `endpointFactories`/`hooks`/`blocks` registration only (proven out by `@base/plugin-form-builder`) — a general plugin system was tried once and removed | **Narrower by design** |
| Jobs / scheduled tasks | ✅ | None | **Missing** |
| Database | Postgres, MongoDB, SQLite adapters | Cloudflare D1 (SQLite) only, raw SQL against dynamically generated per-collection tables | Different tradeoff, not portable |
| Deployment | Node.js server | **One Cloudflare Worker** — content, media, and admin UI all in one edge deployment | Differentiator |
| Edge caching | N/A (server-rendered) | `/api/cdn/*` two-layer cache (browser `Cache-Control` + Workers `caches.default`); content reads still hit D1 directly, no KV edge-cache yet | Partial, self-disclosed |
| Local-first editing | No — edits autosave to the server | Yes — every keystroke writes to `localStorage` only; the network is touched exactly once, on Publish | **Differentiator** |
| Multi-tenancy | Official plugin/pattern | None | **Missing** |
| Admin UI customization | Rich slot system, custom list views, bulk actions | Config-driven fields, but list view is plain (no bulk actions, no custom column formatters yet) | Partial |

### What's most worth improving next

In rough priority order, based on the gaps above and what's already flagged as deliberately deferred internally:

1. **Real per-field/per-document access control** — today it's all-or-nothing on `role === 'admin'`; Payload's access-function model is the obvious reference point.
2. **Deep-field querying** (`where` clauses reaching into a document's `data` JSON) — currently the single biggest daily-use gap; blocks both `join` and any richer admin list filtering.
3. **A generic, registry-driven relationship picker** — replace the three hardcoded `useLiveQuery` calls with something that works for any registered collection, including ones from a plugin.
4. **KV edge-cache for content reads** — the storage CDN route already has this; content (`/api/<collection>`) doesn't yet.
5. **Image variants/focal point** for uploads — currently one file in, one URL out, no resizing.
6. **Server-side version history and scheduled publish** — local-first drafting solves "don't lose my work," not "what did this look like last week" or "publish this at 9am."
7. **A wider plugin surface** — the current `endpointFactories`/`hooks`/`blocks` registration covers what `@base/plugin-form-builder` needs; a real third-party plugin ecosystem needs more surface area than that.

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
