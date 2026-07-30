import { defineRelationsPart, sql } from 'drizzle-orm'
import {
	sqliteTable,
	text,
	integer,
	index,
	uniqueIndex
} from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('emailVerified', { mode: 'boolean' })
		.default(false)
		.notNull(),
	image: text('image'),
	createdAt: integer('createdAt', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	role: text('role'),
	banned: integer('banned', { mode: 'boolean' }).default(false),
	banReason: text('banReason'),
	banExpires: integer('banExpires', { mode: 'timestamp_ms' })
})

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ipAddress'),
		userAgent: text('userAgent'),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		impersonatedBy: text('impersonatedBy')
	},
	(table) => [index('session_userId_idx').on(table.userId)]
)

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		issuer: text('issuer').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		providerId: text('providerId').notNull(),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('accessToken'),
		refreshToken: text('refreshToken'),
		idToken: text('idToken'),
		accessTokenExpiresAt: integer('accessTokenExpiresAt', {
			mode: 'timestamp_ms'
		}),
		refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
			mode: 'timestamp_ms'
		}),
		scope: text('scope'),
		password: text('password'),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('account_issuer_providerAccountId_uidx').on(
			table.issuer,
			table.providerAccountId
		),
		index('account_userId_idx').on(table.userId)
	]
)

export const verification = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
)

export const authRelations = defineRelationsPart(
	{ user, session, account, verification },
	(r) => ({
		user: {
			sessions: r.many.session({
				from: r.user.id,
				to: r.session.userId
			}),
			accounts: r.many.account({
				from: r.user.id,
				to: r.account.userId
			})
		},
		session: {
			user: r.one.user({
				from: r.session.userId,
				to: r.user.id
			})
		},
		account: {
			user: r.one.user({
				from: r.account.userId,
				to: r.user.id
			})
		}
	})
)
