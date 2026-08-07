# @baseconfig/plugin-form-builder

A real [baseConfig](https://github.com/phe-rus/baseconfig) plugin, built entirely on its public extension points (`endpointFactories`/`hooks`/`blocks` registration): a `forms`/`form-submissions` collection pair plus a public contact-form block that posts straight to a generated endpoint.

See the [main repo README](https://github.com/phe-rus/baseconfig#readme) for the bigger picture.

## Install

```bash
bun add @baseconfig/plugin-form-builder
```

## Usage

```ts
// base.config.ts: one call configures the whole plugin, email included
import { baseConfig } from '@baseconfig/core'
import { formBuilderPlugin } from '@baseconfig/plugin-form-builder'

export default baseConfig({
	// ...your other config
	plugins: [
		formBuilderPlugin({
			beforeEmail: async (submission) => { /* ... */ },
			handleEmail: async ({ to, from, subject, html }) => {
				// your real email provider call
			}
		})
	]
})
```

## What's in here

- **`forms`/`form-submissions` collections**: registered automatically, no config-file boilerplate.
- **A public `form` block**: drop it into any page-content `blocks` field; it renders a real, working contact form that POSTs to `/api/forms/:id/submit`.
- **`handleEmail`**: configured directly on `formBuilderPlugin({handleEmail})`, no separate `createHandler()` param needed. Holding the function reference here is safe even though `base.config.ts` is isomorphic; only the function's body has to avoid secrets/server-only bindings, and it's only ever called server-side.

## Peer dependencies

`react`, `hono`, `@tanstack/react-query`, `@baseconfig/core`, `@baseconfig/ui`, see [`package.json`](./package.json) for exact ranges.

## License

MIT
