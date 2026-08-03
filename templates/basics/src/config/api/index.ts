import { createHandler, createLocalAPI } from '@baseconfig/core/api'
import { contentdb } from '@db/db'
import { auth } from './auth/auth'
import { env } from './lib/envs'
import '@/config/base.config'

const isDevelopment = env.ENVIRONMENT === 'development'

const app = createHandler({
	db: contentdb,
	auth: auth,
	bindings: {
		isdev: isDevelopment,
		r2: env.MEDIA,
		kv: env.CACHE
	}
})

// In-process content access for server functions/loaders in this same
// Worker: no HTTP round-trip to the `app` above, see `createLocalAPI`'s own
// doc comment (`@baseconfig/core/api`). e.g. `await baseApi.find({
// collection: 'posts', publishedOnly: true })` from a TanStack Start loader.
export const baseApi = createLocalAPI({ db: contentdb })

export default app
