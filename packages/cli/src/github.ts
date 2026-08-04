import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import * as tar from 'tar'

const REPO = 'phe-rus/baseconfig'
const REF = 'main'

export type Template = { id: string; label: string; hint?: string }

/** Anything a real, hand-cloned copy of `templates/<id>` shouldn't carry into a fresh scaffold, even though it's genuinely git-tracked in the source repo (a dev-time migration tied to this repo's own local D1, a huge `wrangler types`-generated file, ...). Every fresh scaffold regenerates its own copy of these via `bun run local`/`type-gen`. */
const EXCLUDE_BASENAMES = new Set([
	'.migrations',
	'.wrangler',
	'node_modules',
	'dist',
	'bun.lock',
	'worker-configuration.d.ts'
])

function isExcluded(entryPath: string): boolean {
	return entryPath.split('/').some((segment) => EXCLUDE_BASENAMES.has(segment))
}

/** One lightweight GitHub Contents API call, listing this repo's own `templates/` directory, so a new template only ever needs a new folder pushed to the repo, nothing in this CLI's own code changes. Not subject to a meaningful rate-limit concern (one small call, not per-file, unauthenticated GitHub API allows 60/hour/IP). */
export async function listTemplates(): Promise<Template[]> {
	let response: Response
	try {
		response = await fetch(
			`https://api.github.com/repos/${REPO}/contents/templates?ref=${REF}`,
			{ headers: { Accept: 'application/vnd.github+json' } }
		)
	} catch (err) {
		throw new Error(
			`Could not reach GitHub to list available templates: ${err instanceof Error ? err.message : String(err)}`
		)
	}

	if (!response.ok) {
		throw new Error(
			`Could not list templates from github.com/${REPO} (HTTP ${response.status})`
		)
	}

	const entries = (await response.json()) as { name: string; type: string }[]
	return entries
		.filter((entry) => entry.type === 'dir')
		.map((entry) => ({ id: entry.name, label: entry.name }))
}

/**
 * Downloads this repo's own real branch tarball (via `codeload.github.com`,
 * not subject to the Contents API's own rate limit, and a single request
 * regardless of the template's file count, unlike walking the Contents API
 * file-by-file) and extracts only `templates/<templateId>/` out of it,
 * directly into `destDir`. `strip: 3` peels off the tarball's own
 * `<repo>-<ref>/templates/<templateId>/` prefix (confirmed against a real
 * downloaded tarball, not assumed), so `destDir` ends up holding exactly
 * the template's own files with no extra nesting.
 */
export async function downloadTemplate(
	templateId: string,
	destDir: string
): Promise<void> {
	let response: Response
	try {
		response = await fetch(
			`https://codeload.github.com/${REPO}/tar.gz/refs/heads/${REF}`
		)
	} catch (err) {
		throw new Error(
			`Could not download the "${templateId}" template from GitHub: ${err instanceof Error ? err.message : String(err)}`
		)
	}
	if (!response.ok || !response.body) {
		throw new Error(
			`Could not download the "${templateId}" template from github.com/${REPO} (HTTP ${response.status})`
		)
	}

	const tmpDir = mkdtempSync(path.join(tmpdir(), 'baseconfig-cli-'))
	const tarballPath = path.join(tmpDir, 'repo.tar.gz')

	try {
		const buffer = Buffer.from(await response.arrayBuffer())
		writeFileSync(tarballPath, buffer)

		const prefix = `templates/${templateId}/`
		let matched = false

		await tar.x({
			file: tarballPath,
			cwd: destDir,
			strip: 3,
			filter: (entryPath: string) => {
				const withoutRepoPrefix = entryPath.split('/').slice(1).join('/')
				const isTemplateFile =
					withoutRepoPrefix.startsWith(prefix) && !isExcluded(withoutRepoPrefix)
				if (isTemplateFile) matched = true
				return isTemplateFile
			}
		})

		if (!matched) {
			throw new Error(
				`Unknown template "${templateId}": no files found under templates/${templateId}/ in github.com/${REPO}@${REF}.`
			)
		}
	} finally {
		rmSync(tmpDir, { recursive: true, force: true })
	}
}
