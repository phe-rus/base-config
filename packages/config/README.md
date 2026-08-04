# @baseconfig/core

The engine behind [baseConfig](https://github.com/phe-rus/baseconfig), a config-driven CMS engine for TanStack Start, built edge-first for one Cloudflare Worker. This package owns the field vocabulary, the schema deriver, D1-backed content persistence, the Hono API layer, and the full admin UI shell.

See the [main repo README](https://github.com/phe-rus/baseconfig#readme) for screenshots, the full feature list, and the roadmap. See [`CLAUDE.md`](https://github.com/phe-rus/baseconfig/blob/main/config/CLAUDE.md) for the deep internals.

## Install

```bash
bun add @baseconfig/core @baseconfig/ui hono drizzle-orm better-auth
```

## Usage

```ts
// base.config.ts: one call describes your whole app
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
	auth: authClient, // a better-auth client
	config: { adminPath: 'admin' },
	collections: [posts],
	globals: [footer]
})
```

```ts
// api entry: the whole server-side surface is one call
import { createHandler } from '@baseconfig/core/api'

export default createHandler({
	db: drizzle(env.BASECONFIG),
	auth, // a betterAuth() server instance
	bindings: { r2: env.MEDIA, kv: env.CACHE, isdev: env.ENVIRONMENT === 'development' }
})
```

That's it: content CRUD (`/api/<collection>`, `/api/globals/<slug>`), the media library (`/api/storage/*`), and public unauthenticated media serving (`/api/cdn/*`) are all mounted for you.

## What's in here

- **Field vocabulary**: ~20 field types (text/richtext/upload/select/array/blocks/relationship/relations/meta/menu/links, plus layout-only row/collapsible/group/tabs/ui) and the zod schema deriver that turns them into a real document shape.
- **Content persistence**: one D1 table generated per collection/global, raw SQL against dynamically generated tables, no shared `documents` blob table.
- **The Hono API layer**: `createHandler()`, one call that mounts content CRUD, the media library, and the public CDN route, plus your own `better-auth` instance.
- **The admin UI shell**: dashboard, collection list/table, tabbed document editor, page-content blocks (richtext/media/cta/banner/grid/code/relatedPosts), local-first drafting (edits write to `localStorage` only until you publish).

## Peer dependencies

`react`, `hono`, `@tanstack/react-query`, `@tanstack/react-router`, `@tanstack/react-store`, see [`package.json`](./package.json) for exact ranges.

## License

MIT
