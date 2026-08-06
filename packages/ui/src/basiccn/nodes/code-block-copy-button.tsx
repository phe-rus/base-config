import { IconCheck, IconCopy } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { cn } from '../../lib/utils'

/**
 * Shared between the editor's own code block view
 * (`code-block-editable.tsx`) and the read-only preview's
 * (`code-block-preview.tsx`): copies the block's raw, unhighlighted text,
 * never the highlighted markup. `getText` is a closure rather than a plain
 * string prop so it always reads whatever the node's content currently is
 * at click time, not whatever it was when this component last rendered.
 * Built from `packages/ui`'s own `Button` (`icon-xs`, `ghost`), not a bare
 * `<button>`, the same vendored control every other icon-only action in
 * this package uses, so its colors, hover state, and icon sizing all come
 * from `buttonVariants` for free, nothing re-specified here. The only
 * classes added are what `Button` has no opinion on: absolute positioning
 * pinned tight to the corner (`top-1.5 right-1.5`, so it reads as "sitting
 * in the corner" even on a single-line block) and the reveal-on-hover
 * opacity behavior.
 */
export function CodeBlockCopyButton({ getText }: { getText: () => string }) {
	const [copied, setCopied] = useState(false)

	return (
		<Button
			type='button'
			size='icon-xs'
			variant='default'
			className={cn(
				'code-block-copy',
				'absolute right-1.5 top-1.5 z-10 opacity-0',
				'group-hover:opacity-100 focus-visible:opacity-100'
			)}
			aria-label={copied ? 'Copied' : 'Copy code'}
			onClick={async () => {
				await navigator.clipboard.writeText(getText())
				setCopied(true)
				setTimeout(() => setCopied(false), 1500)
			}}
		>
			{copied ? <IconCheck /> : <IconCopy />}
		</Button>
	)
}
