# @baseconfig/plugin-form-builder

A real [baseConfig](https://github.com/phe-rus/base-config) plugin, built entirely on its public extension points (`endpointFactories`/`hooks`/`blocks` registration) — a `forms`/`form-submissions` collection pair plus a public contact-form block that posts straight to a generated endpoint.

See the [main repo README](https://github.com/phe-rus/base-config#readme) for the bigger picture.

## Install

```bash
bun add @baseconfig/plugin-form-builder
```

## Usage

```ts
// base.config.ts
import { baseConfig } from '@baseconfig/core'
import { formBuilderPlugin } from '@baseconfig/plugin-form-builder'

export default baseConfig({
	// ...your other config
	plugins: [formBuilderPlugin({ beforeEmail: async (submission) => { /* ... */ } })]
})
```

```ts
// api entry — email sending is the one thing configured directly on createHandler,
// not on the plugin itself, since it needs a real secret/binding that can never
// reach the client bundle
import { createHandler } from '@baseconfig/core/api'

export default createHandler({
	// ...db, auth, bindings
	handleEmail: async ({ to, from, subject, html }) => {
		// your real email provider call
	}
})
```

## What's in here

- **`forms`/`form-submissions` collections** — registered automatically, no config-file boilerplate.
- **A public `form` block** — drop it into any page-content `blocks` field; it renders a real, working contact form that POSTs to `/api/forms/:id/submit`.
- **`handleEmail`** — a deliberate, named exception to "no capability-specific `createHandler()` params": form submissions need to send email, which needs a real secret or server-only binding that can't live in the isomorphic `base.config.ts`.

## Peer dependencies

`react`, `hono`, `@tanstack/react-query`, `@baseconfig/core`, `@baseconfig/ui` — see [`package.json`](./package.json) for exact ranges.

## License

MIT
