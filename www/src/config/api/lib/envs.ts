import { getRuntimeKey } from 'hono/adapter'

async function Envs() {
	if (getRuntimeKey() === 'workerd') {
		const { env } = await import('cloudflare:workers')
		return env
	} else {
		return process.env as unknown as Env
	}
}

export const env = await Envs()
