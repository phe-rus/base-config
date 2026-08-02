---
name: Bug report
about: Something in baseConfig isn't working as expected
title: ''
labels: bug
assignees: ''

---

**Which package(s)?**
- [ ] `@baseconfig/core`
- [ ] `@baseconfig/ui`
- [ ] `@baseconfig/plugin-form-builder`
- [ ] `@baseconfig/cli`
- [ ] `templates/basics` / `templates/pharmacy` (or your own app scaffolded from either)

**Version(s)**
e.g. `@baseconfig/core@0.0.10`

**Describe the bug**
A clear and concise description of what's broken.

**To reproduce**
Steps to reproduce the behavior, ideally against `templates/basics` or a minimal repro:
1. ...
2. ...

**Expected behavior**
What you expected to happen instead.

**Relevant config**
Your `base.config.ts` (or the relevant `defineCollection`/`defineGlobal`/field config), trimmed to just what's needed to reproduce.

```ts

```

**Environment**
- Bun version: `bun --version`
- Deploying to Cloudflare Workers, or running locally with `wrangler dev`/`--local`?
- Browser (if this is an admin-UI issue): [e.g. Chrome 120]

**Additional context**
Console errors, `wrangler`/D1 logs, or anything else relevant.
