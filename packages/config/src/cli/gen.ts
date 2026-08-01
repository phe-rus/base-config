/**
 * `bun x base gen (--local | --remote) [--skip-auth] [--yes|-y] [flags]`,
 * the generic auth/content schema-gen + migrate orchestrator every consumer
 * previously hand-rolled as their own `scripts/gen.script.ts` (`www`,
 * `templates/basics` each had a near-identical copy). Spawns the same four
 * steps in the same order every consumer needs: `auth@rc generate`, this
 * package's own `bun x base --config=... --output=...` (unchanged, still
 * reachable standalone too), `drizzle-kit generate`, `wrangler d1
 * migrations apply`. `--remote` still runs the full local sequence first,
 * then applies remotely, gated behind an interactive confirmation unless
 * `--yes` was passed (e.g. for CI).
 *
 * Defaults match this package's own `templates/basics` reference layout
 * (`src/config/api/auth/auth.ts`, `src/config/base.config.ts`, ...), a
 * consumer whose file layout differs (e.g. auth wiring still at
 * `src/api/auth/auth.ts`, not nested under `src/config/`) overrides just
 * that one flag, same as any other convention-over-configuration default.
 */
function parseFlags(argv: string[]): Record<string, string | true> {
	const flags: Record<string, string | true> = {}
	for (const arg of argv) {
		if (!arg.startsWith('--')) continue
		const eq = arg.indexOf('=')
		if (eq === -1) flags[arg.slice(2)] = true
		else flags[arg.slice(2, eq)] = arg.slice(eq + 1)
	}
	return flags
}

async function run(command: string[]): Promise<void> {
	console.log(`\n$ ${command.join(' ')}`)
	const proc = Bun.spawn(command, {
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit'
	})
	const exitCode = await proc.exited
	if (exitCode !== 0) {
		console.error(`\nFailed: ${command.join(' ')} (exit ${exitCode})`)
		process.exit(exitCode)
	}
}

/** The one genuinely hard-to-reverse step in this whole chain, gated behind an explicit confirmation unless `--yes` was passed (e.g. for CI). */
function confirmRemote(assumeYes: boolean): boolean {
	if (assumeYes) return true
	const answer = prompt(
		'About to apply migrations to the REMOTE production D1. Type "yes" to continue:'
	)
	return answer?.trim().toLowerCase() === 'yes'
}

export async function runGen(argv: string[]): Promise<void> {
	const isLocal = argv.includes('--local')
	const isRemote = argv.includes('--remote')
	const skipAuth = argv.includes('--skip-auth')
	const assumeYes = argv.includes('--yes') || argv.includes('-y')

	if (isLocal === isRemote) {
		console.error(
			'Usage: bun x base gen (--local | --remote) [--skip-auth] [--yes] [--d1=DB] [--auth-config=...] [--auth-output=...] [--config=...] [--content-output=...] [--drizzle-config=...]'
		)
		process.exit(1)
	}

	const flags = parseFlags(argv)
	const d1Binding = (flags.d1 as string) ?? 'DB'
	const authConfigPath =
		(flags['auth-config'] as string) ?? 'src/config/api/auth/auth.ts'
	const authSchemaOutput =
		(flags['auth-output'] as string) ?? 'db/schemas/users.ts'
	const baseConfigPath = (flags.config as string) ?? 'src/config/base.config.ts'
	const contentSchemaOutput =
		(flags['content-output'] as string) ?? 'db/schemas/content.ts'
	const drizzleConfigPath =
		(flags['drizzle-config'] as string) ?? 'drizzle.config.ts'

	const AUTH_GEN = [
		'bun',
		'x',
		'auth@rc',
		'generate',
		`--config=${authConfigPath}`,
		`--output=${authSchemaOutput}`,
		'-y'
	]
	const BASE_SCHEMA_GEN = [
		'bun',
		'x',
		'base',
		`--config=${baseConfigPath}`,
		`--output=${contentSchemaOutput}`
	]
	const DB_GEN = [
		'bun',
		'x',
		'drizzle-kit',
		'generate',
		`--config=${drizzleConfigPath}`
	]
	const DB_LOCAL = [
		'bun',
		'x',
		'wrangler',
		'd1',
		'migrations',
		'apply',
		d1Binding,
		'--local'
	]
	const DB_REMOTE = [
		'bun',
		'x',
		'wrangler',
		'd1',
		'migrations',
		'apply',
		d1Binding,
		'--remote'
	]

	if (!skipAuth) await run(AUTH_GEN)
	await run(BASE_SCHEMA_GEN)
	await run(DB_GEN)
	await run(DB_LOCAL)

	if (isRemote) {
		if (!confirmRemote(assumeYes)) {
			console.log('Aborted: remote migrations were not applied.')
			process.exit(1)
		}
		await run(DB_REMOTE)
	}
}
