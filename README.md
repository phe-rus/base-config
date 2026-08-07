<p align="center" style="display: flex; border-radius: 5px; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none;padding: p-0;">
  <img src="./screenshot/baseConfig.png" alt="baseConfig" />
</p>

<p align="left">
  <a href="https://github.com/phe-rus/baseconfig/actions"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/phe-rus/baseconfig/publish.yml?style=flat-square"></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/@baseconfig/core">
  <img alt="npm downloads" src="https://img.shields.io/npm/dt/@baseconfig/core?style=flat-square" />
</a>
  &nbsp;
  <a href="https://github.com/phe-rus/baseconfig/graphs/contributors"><img alt="npm" src="https://img.shields.io/github/contributors-anon/phe-rus/baseconfig?color=yellow&style=flat-square" /></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/@baseconfig/core"><img alt="npm" src="https://img.shields.io/npm/v/@baseconfig/core?style=flat-square" /></a>
  &nbsp;
  <a href="https://twitter.com/la_nniina"><img src="https://img.shields.io/badge/follow-la_nniina-1DA1F2?logo=twitter&style=flat-square" alt="La niina Twitter" /></a>
  &nbsp;
  <a href="https://github.com/phe-rus/baseconfig"><img alt="views" src="https://api.visitorbadge.io/api/visitors?path=phe-rus%2Fbaseconfig&label=views&countColor=%23555555&style=flat-square" /></a>
</p>

<hr/>

<div align='center'>
  <h1 align='center'>baseconfig</h1>
  <h3 align='center'>The edge native, local first content<br /> management system for<br /> TanStack Start.</h3>
  
  <p align='center'>
    Build content-driven apps without managing another backend.<br /> Define your content in code, deploy everything to a single Cloudflare Worker,<br /> and edit locally with changes only published when you're ready.
  </p>

  <br />

  <p align='center'><strong>[!WARNING] baseConfig is under active development.</strong><br /> The project is currently in **0.x**. While the core is functional, APIs,<br /> field types, and behavior may change before the<br /> first stable release. It's not yet recommended for production use.
  </p>
</div>

## Why baseConfig?

- ⚡ **Edge-native**
Runs entirely on Cloudflare. Your website, CMS, API, and media library deploy together as a single Worker.

- 💾 **Local-first editing**
Write without worrying about your connection. Changes stay on your device until you choose to publish.

- 🧩 **Config-driven**
Describe your collections, globals, and fields in TypeScript. Your configuration becomes your CMS.

- 📦 **Batteries included**
Collections, globals, rich text, blocks, relationships, media, authentication, and plugins in one place.

- 🔌 **Built to extend**
Create your own fields, blocks, endpoints, hooks, and plugins without fighting the framework.

### Quick Start

Starting a brand new project:

```bash
bunx @baseconfig/cli my-app
```

Follow the prompts (project name, D1/R2/KV resource names), then:

```bash
cd my-app
bun run local   # generate schemas + migrate a local D1
bun run dev
```

Adding baseConfig to an existing TanStack Start project instead:

```bash
bun add @baseconfig/core @baseconfig/ui hono drizzle-orm better-auth
```

Define your content model, mount the handler, and you're ready to go.

```ts
export default baseConfig({
  collections: [...],
  globals: [...],
})
```

That's it.

### baseConfig automatically provides:

- Content API - Mounted to /api/$.ts
- Admin dashboard - Mounted to /admin or whatever path you prefer
- Media library - Pass the binding
- Authentication - But based on your own better auth setup
- File uploads - Fully setup to work with R2
- Storage - Pass R2 Binding
- Dashboard - Covered in admin/$.ts catch all

All running from the same Cloudflare Worker.

## Roadmap

- [x] ~20 field types (text, textarea, richtext, checkbox, switch, date, keywords, upload, select, combobox, radio, email, number, password, confirmPassword, hidden, code, json, slug, point), plus composite types (array, blocks, relationship, relations, meta, menu, links) and layout-only types (row, collapsible, group, tabs-as-field, ui)
- [x] Real D1-backed content persistence, one table per collection/global
- [x] Local-first drafting (edits live in `localStorage` until published)
- [x] 7 built-in page blocks (richtext, media, cta, banner, grid, code, relatedPosts)
- [x] Plugin system (`endpointFactories`/`hooks`/`blocks`) with a reference plugin (`@baseconfig/plugin-form-builder`)
- [x] R2-backed media library
- [x] Project-scaffolding CLI (`@baseconfig/cli`), with two reference templates (`basics`, a minimal end-to-end app; `pharmacy`, a fuller e-commerce-style example)
- [x] Generated per-collection/global TypeScript types (`base.types.ts`), giving `base.find`/`findByID`/`findGlobal` full type safety
- [x] Field pruning: reconciles stored data against the current schema, dropping anything left over from a renamed/removed field (an explicit admin "Prune" action, plus automatic reconciliation of local drafts)
- [x] Collection/global-level access control (Payload-style `access: {create, read, update, delete}` functions per collection, `{read, update}` per global; unset means open, matching Payload's own default)
- [x] Local API parity: `createLocalAPI()` (`@baseconfig/core/api`), an in-process `find`/`findByID`/`create`/`update`/`delete`/`prune`/`findGlobal`/`updateGlobal`/`pruneGlobal` client for server functions/loaders in the same Worker, no HTTP round-trip, `overrideAccess` defaulting to trusted (matching Payload's own Local API)
- [ ] `join` field (virtual, reverse-relationship queries)
- [ ] Field-level `unique`/`index` (blocked on every field currently living in one opaque `data` JSON column rather than its own SQL column)
- [ ] Field-level conditional visibility (show/hide a field based on a sibling field's value)
- [ ] `virtual` fields (computed, not stored)
- [ ] Field-level `validate`/`hooks`/`access` (collection/global-level access is done, see above; field-level is a distinct, still-open piece)
- [ ] A sidebar layout option for the document editor

<div align="center">
  <h2 style="margin-top: 50px; margin-bottom: 15px; font-weight: 500;">Technologies we use & love</h2>
  
  <p>
    <img src="https://tanstack.com/favicon.ico" alt="TanStack Start" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://www.cloudflare.com/favicon.ico" alt="Cloudflare" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://turbo.build/favicon.ico" alt="Turborepo" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://better-auth.com/branding/svg/better-auth-mark-light.svg" alt="Better Auth" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://www.anthropic.com/favicon.ico" alt="Claude Code" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://bun.sh/favicon.ico" alt="Bun" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://orm.drizzle.team/favicon.ico" alt="Drizzle ORM" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://git-scm.com/favicon.ico" alt="Git" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
    <img src="https://ui.shadcn.com/favicon.ico" alt="shadcn/ui" width="30" height="30" style="border-radius: 50%; margin: 4px;" />
  </p>


  <h2>License</h2>
   
  [MIT](./LICENSE)

  <h2>👏 Thanks to all our contributors</h2>

<img align="center" src="https://contributors-img.web.app/image?repo=phe-rus/baseconfig"/>

</div>
