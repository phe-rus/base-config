// Relative, not `@db/schemas/users`, see auth.ts's own comment on why:
// the standalone `bun x auth@rc generate` CLI needs to load this file's
// whole import chain via its own module loader, which doesn't resolve
// tsconfig `paths`.
import { authRelations } from './schemas/users'
import { drizzle } from 'drizzle-orm/d1'
import { env } from '@/config/api/lib/envs'

// One D1 database backs both better-auth's own tables and the CMS content
// tables, see @baseconfig/core's own "Database"/"Content persistence" docs
// for why (content tables are `cn`-prefixed, so there's no collision risk).

export const authdb = drizzle(env.D1, {
	logger: false,
	relations: {
		...authRelations
	}
})

// No `relations`, @baseconfig/core's query layer is raw SQL against
// dynamically-resolved table names, not Drizzle's relational query builder.
export const contentdb = drizzle(env.D1, { logger: false })
