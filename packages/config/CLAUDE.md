# CLAUDE.md: `packages/config`

Internals of the `@baseconfig/core` engine. This top-level file is a short index; the actual conventions live in subdirectory-scoped `CLAUDE.md` files that load automatically when a session is working in that specific area, so a task touching only field types doesn't have to load the whole engine's worth of documentation.

- **`src/fields/CLAUDE.md`**: the field vocabulary, schema deriver, and field renderer (`fields/types.ts`, `fields/schema.ts`, `fields/renderer.tsx`).
- **`src/collections/CLAUDE.md`**: the three config factories (`defineCollection`/`defineGlobal`/`baseConfig`), the three admin dispatch namespaces, relationships, nav menus, and page-content blocks.
- **`src/db/CLAUDE.md`**: content persistence (real D1, one table per collection/global), the local-first draft system, the global keyword pool, and the real server-backed `users` collection.
- **`src/admin/CLAUDE.md`**: SSR safety, the admin session guard, the auth screens, and the storage admin page.
- **`src/api/CLAUDE.md`**: the Hono route factories, public-read caching, and the CDN route.

**`templates/basics`** is this repo's own reference/dev app for this library (email+password-only auth, `users`/`posts` collections, `keywords`/`storage` globals, no plugins), mirroring `www`'s wiring shape at minimal scope. Note it pins `@baseconfig/core`/`@baseconfig/ui` to the published `0.0.11` (older than the current workspace build, so `bun x base gen` there runs the registry-cached core, not this repo's `packages/config` source); **`www` is the `workspace:*` consumer** and the place to manually verify a change to this library actually works end to end (`bun run local` then `bun run dev`).
