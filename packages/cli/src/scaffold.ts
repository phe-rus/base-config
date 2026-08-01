import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { downloadTemplate } from './github'
import { fetchLatestVersion } from './npm-registry'
import type { ScaffoldAnswers } from './prompts'

function commandExists(command: string): boolean {
	const probe = process.platform === 'win32' ? 'where' : 'which'
	return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0
}

function readJson(filePath: string): Record<string, any> {
	return JSON.parse(readFileSync(filePath, 'utf8'))
}

function writeJson(filePath: string, value: unknown): void {
	writeFileSync(filePath, `${JSON.stringify(value, null, '\t')}\n`)
}

/** Renames the cloned template's own `package.json` and resolves `@baseconfig/core`/`@baseconfig/ui` to whatever's actually latest on npm right now, replacing whatever version happens to be committed in the source repo's own copy of the template at this exact moment. */
async function updatePackageJson(answers: ScaffoldAnswers): Promise<void> {
	const pkgPath = path.join(answers.targetDir, 'package.json')
	const pkg = readJson(pkgPath)
	pkg.name = answers.name

	const [coreVersion, uiVersion] = await Promise.all([
		fetchLatestVersion('@baseconfig/core'),
		fetchLatestVersion('@baseconfig/ui')
	])
	if (pkg.dependencies?.['@baseconfig/core']) {
		pkg.dependencies['@baseconfig/core'] = coreVersion
	}
	if (pkg.dependencies?.['@baseconfig/ui']) {
		pkg.dependencies['@baseconfig/ui'] = uiVersion
	}

	writeJson(pkgPath, pkg)
}

/**
 * `wrangler.jsonc` is JSONC (real comments the template relies on to explain
 * the placeholder ids), so this stays a targeted text replace on the two
 * real name fields the template ships (`database_name`/`bucket_name`)
 * rather than a JSON.parse/stringify round-trip, which would silently
 * drop every comment. There's no equivalent field for the KV namespace's
 * chosen name: `kv_namespaces[]` only ever has `binding`/`id`, a KV
 * namespace's human name only exists as an argument to a real
 * `wrangler kv namespace create <name>` call, never as config.
 */
function updateWranglerConfig(answers: ScaffoldAnswers): void {
	const wranglerPath = path.join(answers.targetDir, 'wrangler.jsonc')
	let contents = readFileSync(wranglerPath, 'utf8')

	contents = contents.replace(
		/"database_name":\s*"[^"]*"/,
		`"database_name": "${answers.d1Name}"`
	)
	contents = contents.replace(
		/"bucket_name":\s*"[^"]*"/,
		`"bucket_name": "${answers.r2Name}"`
	)

	writeFileSync(wranglerPath, contents)
}

function runInstall(targetDir: string): void {
	if (!commandExists('bun')) {
		console.log(
			'\nSkipped `bun install`: Bun was not found on PATH. Install Bun (https://bun.sh), then run `bun install` yourself.'
		)
		return
	}
	spawnSync('bun', ['install'], { cwd: targetDir, stdio: 'inherit' })
}

function runGitInit(targetDir: string): void {
	if (!commandExists('git')) return
	spawnSync('git', ['init', '--quiet'], { cwd: targetDir, stdio: 'ignore' })
	spawnSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore' })
	spawnSync(
		'git',
		['commit', '--quiet', '-m', 'chore: scaffold from @baseconfig/cli'],
		{ cwd: targetDir, stdio: 'ignore' }
	)
}

export async function scaffold(answers: ScaffoldAnswers): Promise<void> {
	if (existsSync(answers.targetDir)) {
		throw new Error(`"${answers.targetDir}" already exists`)
	}
	mkdirSync(answers.targetDir, { recursive: true })

	await downloadTemplate(answers.template, answers.targetDir)
	updateWranglerConfig(answers)
	await updatePackageJson(answers)

	if (answers.install) runInstall(answers.targetDir)
	if (answers.git) runGitInit(answers.targetDir)
}
