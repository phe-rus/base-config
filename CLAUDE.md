# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**baseConfig**: a config-driven, edge-native CMS engine for TanStack Start on Cloudflare Workers. A consumer app describes its content model (collections/globals/fields) in TypeScript; this repo provides the engine that turns that config into D1-backed content persistence, a Hono API layer, and a full admin UI, all deployable as a single Cloudflare Worker.

This repo (`base-config`) is published to npm as three packages, consumed by external apps (e.g. `www`, in a separate repo) as real dependency versions, not via a workspace link. There is no filesystem access to any consumer app from here.

## Workspace layout

Bun workspaces + Turborepo, five publishable/runnable units:

- **`packages/config`** (`@baseconfig/core`) is the engine: field vocabulary, zod schema deriver, D1 content persistence (raw SQL, one table per collection/global), the Hono API layer, the admin UI shell, the `base` CLI. See `packages/config/CLAUDE.md` for an index into its subdirectory-scoped docs (each loads automatically when working in that specific area).
- **`packages/ui`** (`@baseconfig/ui`) is the sibling primitive library: vendored shadcn/base-ui components, a Tiptap v3 rich text editor, the `useAppForm`-based form field system `@baseconfig/core` renders every field through. Deliberately decoupled from any specific consumer design system, using plain Tailwind utility classes over CSS custom properties. See `packages/ui/CLAUDE.md` for an index into its own subdirectory-scoped docs.
- **`packages/cli`** (`@baseconfig/cli`) is the project-scaffolding CLI, invoked as `bunx @baseconfig/cli my-app` (its own bin command is `baseconfig`). A standalone tool, not a subcommand of the `base` CLI above: it runs *before* any project exists, so it can't assume `@baseconfig/core` is already installed the way `base gen` does. Bundles a build-time snapshot of `templates/basics` (synced by its own `scripts/sync-template.ts`), resolves `@baseconfig/core`/`@baseconfig/ui`'s actual latest npm versions at scaffold time rather than baking in whatever version happened to be current at its own last publish, and writes the user's chosen D1/R2/KV resource names into the copied `wrangler.jsonc`. No runtime dependency on `core`/`ui` themselves.
- **`plugins/plugin-form-builder`** (`@baseconfig/plugin-form-builder`) is a reference plugin built entirely on public extension points (`endpointFactories`/`hooks`/`blocks`): a `forms`/`form-submissions` collection pair plus a public contact-form block. The template to look at when building a new plugin.
- **`templates/basics`** is the reference/dev-testbed app, a real workspace member (`workspace:*` on `@baseconfig/core`/`@baseconfig/ui`). One `posts` collection, one `settings` global, email+password-only auth, no plugins: the minimal end-to-end wiring example. Use this app to manually verify a change to the library actually works before publishing; don't add features to it beyond what's needed to exercise the library. It's also the single source of truth `@baseconfig/cli` bundles as its own scaffold output.

Dependency direction: `plugin-form-builder` depends on both `core` and `ui`; `core` depends on `ui`; `templates/basics` consumes `core`/`ui` as `workspace:*` dependencies; `@baseconfig/cli` depends on neither (it only ever resolves their published versions over the network, at scaffold time). All four publishable packages (`core`, `ui`, `plugin-form-builder`, `@baseconfig/cli`) are versioned and released together (see Publishing below), even though they're semantically independent.

## Commands

Root (Turborepo-orchestrated across all workspaces):
```bash
bun install          # install everything
bun run build         # turbo build: respects dependency order (ui before config, etc.)
bun run dev            # turbo dev: watch mode, persistent, all packages in parallel
bun run typecheck      # turbo typecheck: tsc --noEmit per package
bun run lint           # biome check --write .
bun run format         # biome format --write .
```

Per-package (`packages/config`, `packages/ui`, `plugins/plugin-form-builder`, `templates/basics`) all share the same script shape: `build` (tsdown for the libraries, vite for the app), `dev` (tsdown --watch / vite dev), `typecheck` (tsc --noEmit). Run from the package directory or via `turbo run <task> --filter=<package-name>`.

**`templates/basics`**'s own scripts:
```bash
bun run dev            # vite dev --port=3000
bun run build           # vite build
bun run deploy          # wrangler deploy
bun run local            # bun x base gen --local  (regenerate schema + migrate local D1)
bun run remote            # bun x base gen --remote  (same, against real remote D1)
```

There is no test suite in this repo (no vitest/jest config, no `*.test.ts` files anywhere); validate changes via `typecheck` plus manually exercising them in `templates/basics`.

### The `base` CLI (`packages/config/src/cli.ts`)

`@baseconfig/core` ships its own CLI (`bin: {base: ...}`), the mechanism a consumer uses to regenerate their generated D1 content schema from their `base.config.ts`. `bun x base gen (--local | --remote) [--skip-auth] [--yes]` is the full orchestrator: `auth generate` → content-schema codegen → `drizzle-kit generate` → `wrangler d1 migrations apply`. Any change to a collection/global's shape needs this re-run, then a real migration; this is not automatic.

## Code style (Biome, `biome.json`)

- Tabs for indentation, single quotes, no semicolons (`semicolons: "asNeeded"`), no trailing commas.
- `noExplicitAny` and `noArrayIndexKey` are off: this codebase uses both deliberately in places.
- Import organization is off in the assist config; don't rely on Biome to sort imports automatically outside the editor's own save action.
- Format/lint with `bun run format` / `bun run lint` before considering a change done; CI's publish workflow does not itself lint, so this is enforced by convention, not a gate.
- **No em-dashes** (`—`, U+2014) in comments, doc comments, or string literals: use a comma, colon, semicolon, parentheses, or a sentence split instead. Hyphens are fine for compound words (`config-driven`, `field-level`). The one exception is an em-dash that's part of actual stored/displayed content data, never something to hunt down or "fix."

## Publishing (`.github/workflows/publish.yml`)

Push to `main` with a commit message **starting with** `final:publish` (not just containing it: a docs commit mentioning the phrase must not fire this) to build, patch-bump, and publish all four packages to npm via OIDC Trusted Publishing. All four are bumped and released together regardless of which actually changed. Never craft a commit message starting with `final:publish` unless you intend to trigger a real npm release.

## Cross-cutting architectural notes

These apply repo-wide; package-specific depth lives in `packages/config/CLAUDE.md` and `packages/ui/CLAUDE.md`, which load automatically when you're working in those directories.

- **Config-driven, not code-driven**: a consumer's entire content model is `defineCollection`/`defineGlobal` calls passed to `baseConfig({...})` in one `base.config.ts`. The engine derives schema, default values, and admin UI from that config; there's no separate manual wiring step per collection.
- **Local-first drafting**: every edit in the admin UI writes to a `localStorage`-backed draft collection first (zero network calls); the only action that ever reaches the real D1-backed API is an explicit Publish/Update.
- **One real SQL table per collection/global**, dynamically generated from whatever a consumer has registered, not a single shared `documents` blob table. Table names are `cn-`-prefixed to avoid collision with `better-auth`'s own tables in the same D1 database.
- **Everything deploys as one Cloudflare Worker**: content API, admin UI, media library (R2-backed), and public CDN route are all mounted by one `createHandler()` call server-side.
- **Registries, not closed unions**: `collectionsBySlug`/`globalsBySlug`/`blocksBySlug` (`packages/config/src/collections/registry.ts`) are runtime `Record`s populated by `baseConfig()`/plugin registration, specifically so an external plugin package can add a collection, global, or block without needing to own a TypeScript union it doesn't control.
