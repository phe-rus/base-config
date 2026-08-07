import { createHandler, createLocalAPI } from '@baseconfig/core/api'
import { contentdb } from '@db/db'
import { auth } from './auth/auth'
import { env } from './lib/envs'
import '@/config/base.config'

const isDevelopment = env.ENVIRONMENT === 'development'
export const baseApi = createLocalAPI({ db: contentdb })

const app = createHandler({
	db: contentdb,
	auth: auth,
	bindings: {
		isdev: isDevelopment,
		r2: env.R2,
		kv: env.CACHE
	}
})

export default app
