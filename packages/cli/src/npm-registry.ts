/** Resolves a package's current `latest` dist-tag from the real npm registry, so a freshly scaffolded project never inherits a stale version baked into this package's own bundled template snapshot. */
export async function fetchLatestVersion(packageName: string): Promise<string> {
	let response: Response
	try {
		response = await fetch(
			`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`
		)
	} catch (err) {
		throw new Error(
			`Could not reach the npm registry to resolve "${packageName}"'s latest version: ${err instanceof Error ? err.message : String(err)}`
		)
	}

	if (!response.ok) {
		throw new Error(
			`Could not resolve "${packageName}"'s latest version (npm registry responded ${response.status})`
		)
	}

	const data = (await response.json()) as { version?: string }
	if (!data.version) {
		throw new Error(`npm registry response for "${packageName}" had no version field`)
	}

	return data.version
}
