<p align="center" style="display: flex; border-radius: 5px; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none;padding: p-0;">
  <img src="./screenshot/baseConfig.png" alt="baseConfig" />
</p>

<p align="left">
  <a href="https://github.com/phe-rus/base-config/actions"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/phe-rus/base-config/publish.yml?style=flat-square"></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/@baseconfig/core">
  <img alt="npm downloads" src="https://img.shields.io/npm/dt/@baseconfig/core?style=flat-square" />
</a>
  &nbsp;
  <a href="https://github.com/phe-rus/base-config/graphs/contributors"><img alt="npm" src="https://img.shields.io/github/contributors-anon/phe-rus/base-config?color=yellow&style=flat-square" /></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/@baseconfig/core"><img alt="npm" src="https://img.shields.io/npm/v/@baseconfig/core?style=flat-square" /></a>
  &nbsp;
  <a href="https://twitter.com/la_nniina"><img src="https://img.shields.io/badge/follow-la_nniina-1DA1F2?logo=twitter&style=flat-square" alt="La niina Twitter" /></a>
  &nbsp;
  <a href="https://github.com/phe-rus/base-config"><img alt="views" src="https://api.visitorbadge.io/api/visitors?path=phe-rus%2Fbase-config&label=views&countColor=%23555555&style=flat-square" /></a>
</p>
<hr/>

# baseConfig

> **The edge-native, local-first CMS for TanStack Start.**

Build content-driven apps without managing another backend. Define your content in code, deploy everything to a single Cloudflare Worker, and edit locally with changes only published when you're ready.

> [!WARNING]
> **baseConfig is under active development.**
>
> The project is currently in **0.x**. While the core is functional, APIs, field types, and behavior may change before the first stable release. It's not yet recommended for production use.

---

## Why baseConfig?

⚡ **Edge-native**
Runs entirely on Cloudflare. Your website, CMS, API, and media library deploy together as a single Worker.

💾 **Local-first editing**
Write without worrying about your connection. Changes stay on your device until you choose to publish.

🧩 **Config-driven**
Describe your collections, globals, and fields in TypeScript. Your configuration becomes your CMS.

📦 **Batteries included**
Collections, globals, rich text, blocks, relationships, media, authentication, and plugins in one place.

🔌 **Built to extend**
Create your own fields, blocks, endpoints, hooks, and plugins without fighting the framework.

---

## Preview

> *(Replace this section with one large screenshot or a short GIF.)*

---

## Quick Start

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

baseConfig automatically provides:

- Content API
- Admin dashboard
- Media library
- Authentication
- File uploads
- Storage
- Dashboard

All running from the same Cloudflare Worker.

---

## Built with

- TanStack Start
- Cloudflare Workers
- Hono
- Drizzle ORM
- D1
- R2
- Better Auth
- TypeScript

## License

[MIT](./LICENSE)

## 👏 Thanks to all our contributors

<img align="center" src="https://contributors-img.web.app/image?repo=phe-rus/base-config"/>