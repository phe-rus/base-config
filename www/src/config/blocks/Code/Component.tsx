import type { FC } from 'react'

/**
 * Plain, SSR-safe `<pre>` for the docs page. Replaced the library default's
 * tiptap/`Preview`-based highlighting path deliberately: no hydration gap,
 * trivially styleable. Swap for a highlighting renderer if the site wants
 * one.
 */
export const CodeBlock: FC<{
	language?: string
	code?: string
}> = ({ code }) => {
	if (!code) return null
	return (
		<pre className='overflow-x-auto rounded-lg bg-muted p-4 text-sm'>
			<code>{code}</code>
		</pre>
	)
}
