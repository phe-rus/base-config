import { cn } from '../../lib/utils'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { groupCommands, type CommandItem } from '../utils/commands'

export interface SlashMenuListProps {
	items: CommandItem[]
	command: (item: CommandItem) => void
}

export interface SlashMenuListRef {
	/** `event` is the native DOM `KeyboardEvent` from `@tiptap/suggestion`'s
	 * `onKeyDown`, not React's synthetic `KeyboardEvent`: the suggestion
	 * plugin intercepts the raw ProseMirror `keydown` before React ever
	 * sees it. */
	onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

/**
 * Mounted imperatively by `plugins/slash.ts` via tiptap's `ReactRenderer` +
 * `@tiptap/suggestion`'s `mount()`, not rendered declaratively as a normal
 * JSX child in `editor.tsx`. `onKeyDown` is exposed via `useImperativeHandle`
 * because the suggestion plugin intercepts editor keydowns (arrow/enter) and
 * forwards them here before ProseMirror ever sees them.
 */
export const Slashmenus = forwardRef<SlashMenuListRef, SlashMenuListProps>(
	function Slashmenus({ items, command }, ref) {
		const [selectedIndex, setSelectedIndex] = useState(0)

		useEffect(() => {
			setSelectedIndex(0)
		}, [items])

		const select = (index: number) => {
			const item = items[index]
			if (item) command(item)
		}

		useImperativeHandle(ref, () => ({
			onKeyDown: ({ event }) => {
				if (event.key === 'ArrowDown') {
					setSelectedIndex((index) => (index + 1) % items.length)
					return true
				}
				if (event.key === 'ArrowUp') {
					setSelectedIndex((index) => (index - 1 + items.length) % items.length)
					return true
				}
				if (event.key === 'Enter') {
					select(selectedIndex)
					return true
				}
				return false
			}
		}))

		if (items.length === 0) {
			return (
				<div
					className={cn(
						'w-56 rounded-sm border border-input/25 bg-popover',
						'px-3 py-2 text-xs text-muted-foreground shadow-md'
					)}
				>
					No results
				</div>
			)
		}

		const groups = groupCommands(items)
		let flatIndex = -1

		return (
			<div
				className={cn(
					'flex max-h-80 w-56 flex-col gap-1 overflow-y-auto rounded-sm',
					'border border-input/25 bg-popover p-1 text-xs shadow-md no-scrollbar'
				)}
			>
				{groups.map((group) => (
					<div key={group.group} className='flex flex-col gap-0.5'>
						<span className='px-2 py-1 text-muted-foreground'>
							{group.group}
						</span>
						{group.items.map((item) => {
							flatIndex += 1
							const index = flatIndex
							return (
								<button
									key={item.id}
									type='button'
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => select(index)}
									className={cn(
										'flex items-center gap-2 rounded-md px-2 py-1.5 text-left',
										index === selectedIndex &&
											'bg-accent text-accent-foreground'
									)}
								>
									<item.icon className='dualTone size-4 shrink-0' />
									{item.label}
								</button>
							)
						})}
					</div>
				))}
			</div>
		)
	}
)
