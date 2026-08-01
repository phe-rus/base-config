import { Button } from '../../components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '../../components/popover'
import { cn } from '../../lib/utils'
import { IconPlus } from '@tabler/icons-react'
import type { Editor } from '@tiptap/react'
import { useState, type FC } from 'react'
import { commands, groupCommands } from '../utils/commands'

interface AddBlockButtonProps {
	editor: Editor
}

/**
 * Sits next to the drag-handle grip (see `editor.tsx`): a click-triggered
 * version of the exact same list `plugins/slash.ts` shows on `/`, grouped
 * the same way. Lives outside the bubble menu entirely, so it doesn't need
 * the `onPinChange`/`shouldShow` pinning dance `components/bubble-menus.tsx`
 * uses. That's specifically for popovers nested *inside* the
 * blur-sensitive `BubbleMenu`, which this isn't.
 */
export const AddBlockButton: FC<AddBlockButtonProps> = ({ editor }) => {
	const [open, setOpen] = useState(false)
	const groups = groupCommands(commands)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						size='icon-xs'
						variant='default'
						className='rounded w-fit! inline-block my-auto!'
						title='Add block'
					/>
				}
			>
				<IconPlus />
			</PopoverTrigger>
			<PopoverContent
				align='start'
				sideOffset={6}
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
						{group.items.map((item) => (
							<button
								key={item.id}
								type='button'
								onClick={() => {
									item.run(editor)
									setOpen(false)
								}}
								className={cn(
									'flex items-center gap-2 rounded-md px-2 py-1.5 text-left',
									'hover:bg-accent hover:text-accent-foreground'
								)}
							>
								<item.icon className='dualTone size-4 shrink-0' />
								{item.label}
							</button>
						))}
					</div>
				))}
			</PopoverContent>
		</Popover>
	)
}
