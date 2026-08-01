import { cn } from '../../lib/utils'
import type { Editor } from '@tiptap/react'
import { useEffect, useState, type FC } from 'react'

interface LinkHoverCardProps {
	editor: Editor
}

interface HoverTarget {
	href: string
	rect: DOMRect
}

/**
 * Small floating tooltip that shows a link's destination on hover, anywhere
 * in the editor's rendered content (not just when it's selected). Reads the
 * DOM directly via `editor.view.dom` rather than a tiptap plugin/decoration.
 * Link elements are plain ProseMirror-rendered `<a>` tags, so listening
 * for `mouseover`/`mouseout` at the editor root is simpler than wiring a
 * ProseMirror plugin just to track hover state.
 */
export const LinkHoverCard: FC<LinkHoverCardProps> = ({ editor }) => {
	const [hover, setHover] = useState<HoverTarget | null>(null)

	useEffect(() => {
		const dom = editor.view.dom

		const onOver = (event: MouseEvent) => {
			const target = (event.target as HTMLElement).closest?.('a[href]')
			if (!target) return
			setHover({
				href: target.getAttribute('href') ?? '',
				rect: target.getBoundingClientRect()
			})
		}
		const onOut = (event: MouseEvent) => {
			const related = event.relatedTarget as HTMLElement | null
			if (related?.closest?.('a[href]')) return
			setHover(null)
		}
		const onScroll = () => setHover(null)

		dom.addEventListener('mouseover', onOver)
		dom.addEventListener('mouseout', onOut)
		window.addEventListener('scroll', onScroll, true)
		return () => {
			dom.removeEventListener('mouseover', onOver)
			dom.removeEventListener('mouseout', onOut)
			window.removeEventListener('scroll', onScroll, true)
		}
	}, [editor])

	if (!hover) return null

	let display = hover.href
	try {
		const url = new URL(hover.href, window.location.origin)
		display = url.hostname + (url.pathname === '/' ? '' : url.pathname)
	} catch {
		// relative or malformed href: fall back to showing it verbatim
	}

	return (
		<div
			role='tooltip'
			className={cn(
				'fixed z-50 max-w-2xs truncate rounded-md bg-card px-2 py-1',
				'text-[0.6875rem] text-card-foreground shadow pointer-events-none'
			)}
			style={{ top: hover.rect.bottom + 6, left: hover.rect.left }}
		>
			{display}
		</div>
	)
}
