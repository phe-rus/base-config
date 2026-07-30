export function slugify(name: string): string {
	return name
		.normalize('NFD') // Separate accents/diacritics
		.replace(/[\u0300-\u036f]/g, '') // Remove accent marks
		.toLowerCase() // Convert to lowercase
		.trim() // Trim leading/trailing whitespace
		.replace(/[^a-z0-9]+/g, '-') // Replace any sequence of non-alphanumeric chars (including dots, colons, commas) with a single hyphen
		.replace(/^-+|-+$/g, '') // Trim leading and trailing hyphens
}

/** The reverse direction - `'blog-posts'` becomes `'Blog Posts'`. Used by `defineCollection`/`defineGlobal` to derive a default `label` when one isn't given, since `slug` alone is enough to display something reasonable. */
export function labelFromSlug(slug: string): string {
	return slug
		.split('-')
		.filter(Boolean)
		.map((word) => word[0]?.toUpperCase() + word.slice(1))
		.join(' ')
}
