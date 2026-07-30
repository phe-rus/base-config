import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { betterAuth } from 'better-auth/minimal'
import * as authSchema from '../../../../db/schemas/users'
import type { User } from 'better-auth/types'
import { admin } from 'better-auth/plugins'
import { env } from '@/config/api/lib/envs'
// Relative, not `@db/db` — the standalone `bun x auth@rc generate` CLI
// loads this file via its own module loader (jiti), which doesn't resolve
// tsconfig `paths` the way Vite does; a relative import here works
// regardless of which tool is loading the file.
import { authdb } from '../../../../db/db'

const isProd = env.ENVIRONMENT === 'production'

// Bring your own real email provider here (Resend, Cloudflare Email, SMTP,
// whatever) — this package ships no default implementation, deliberately.
// See @baseconfig/plugin-form-builder's own `handleEmail` doc comment for
// the same reasoning applied to form-submission emails.
const handleEmail = (
	kind: 'Email verification' | 'Password reset' | 'Delete account',
	payload: { url?: string; token?: string; user: User }
) => {
	console.log('handleEmail (not wired to a real provider yet)', kind, payload)
}

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	appName: env.VITE_APPNAME,
	baseURL: env.BETTER_AUTH_URL,
	database: drizzleAdapter(authdb, {
		camelCase: true,
		provider: 'sqlite',
		schema: authSchema
	}),
	databaseHooks: {
		user: {
			create: {
				// The very first account created becomes admin automatically —
				// still the only bootstrap-admin path.
				before: async (user, ctx) => {
					const adapter = ctx?.context?.adapter
					let role: 'admin' | 'user' = 'user'
					if (adapter) {
						const count = await adapter.count({ model: 'user' })
						if (count === 0) role = 'admin'
					}
					return { data: { ...user, role } }
				}
			}
		}
	},
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		requireEmailVerification: false,
		sendResetPassword: async ({ user, url, token }) => {
			handleEmail('Password reset', { url, token, user })
		}
	},
	emailVerification: {
		autoSignInAfterVerification: true,
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url, token }) => {
			handleEmail('Email verification', { url, token, user })
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30 // 30 days
	},
	user: {
		deleteUser: {
			enabled: true,
			sendDeleteAccountVerification: async ({ user, url, token }) => {
				handleEmail('Delete account', { url, token, user })
			}
		}
	},
	advanced: {
		cookiePrefix: env.VITE_APPNAME,
		useSecureCookies: isProd,
		defaultCookieAttributes: {
			httpOnly: true,
			secure: isProd,
			sameSite: 'lax'
		}
	},
	telemetry: {
		enabled: false
	},
	plugins: [admin(), tanstackStartCookies()]
})
