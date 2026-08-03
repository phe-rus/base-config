import { resolveLocalD1File } from '@baseconfig/core/db/local-d1'
import type { Config } from 'drizzle-kit'

export default {
	out: '.migrations/',
	schema: './db/schemas',
	dialect: 'sqlite',
	breakpoints: false,
	dbCredentials: { url: resolveLocalD1File() ?? '' }
} satisfies Config
