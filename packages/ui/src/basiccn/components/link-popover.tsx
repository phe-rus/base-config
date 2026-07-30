import { Button } from '../../components/button'
import { Input } from '../../components/input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '../../components/popover'
import { cn } from '../../lib/utils'
import {
	IconExternalLink,
	IconLink,
	IconPlus,
	IconTrash
} from '@tabler/icons-react'
import type { Editor } from '@tiptap/react'
import { useState, type FC, type FormEvent } from 'react'

interface LinkPopoverProps {
	editor: Editor
	active: boolean
	onPinChange: (open: boolean) => void
}

export const LinkPopover: FC<LinkPopoverProps> = ({
	editor,
	active,
	onPinChange
}) => {
	const [url, setUrl] = useState('')

	const apply = (event: FormEvent) => {
		event.preventDefault()
		const trimmed = url.trim()
		if (!trimmed) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run()
			return
		}
		editor
			.chain()
			.focus()
			.extendMarkRange('link')
			.setLink({ href: trimmed })
			.run()
	}

	const remove = () => {
		editor.chain().focus().extendMarkRange('link').unsetLink().run()
		setUrl('')
	}

	const openLink = () => {
		const href = url.trim() || editor.getAttributes('link').href
		if (!href) return
		window.open(href, '_blank', 'noopener,noreferrer')
	}

	return (
		<Popover
			onOpenChange={(open) => {
				onPinChange(open)
				if (open) setUrl(editor.getAttributes('link').href ?? '')
			}}
		>
			<PopoverTrigger
				render={
					<Button
						size='icon'
						variant={active ? 'secondary' : 'ghost'}
						className='rounded-full!'
						title='Link'
					/>
				}
			>
				<IconLink />
			</PopoverTrigger>
			<PopoverContent
				align='end'
				sideOffset={4}
				className={cn(
					'w-64 mt-1 rounded-sm border border-input/25',
					'bg-popover p-1 text-xs shadow',
					'backdrop-blur'
				)}
			>
				<form onSubmit={apply} className='flex items-center gap-1'>
					<Input
						autoFocus
						placeholder='https://…'
						value={url}
						className={cn(
							'h-6 text-xs! bg-transparent! outline-none! ring-0! border-0 border-b',
							'rounded-none border-b-input/35 focus:border-b-2',
							'transition-colors duration-150 focus-visible:border-b-input/45 '
						)}
						onChange={(event) => setUrl(event.target.value)}
					/>
					{url.trim() || active ? (
						<Button
							type='button'
							size='icon-xs'
							variant='ghost'
							title='Open link'
							onClick={openLink}
							className='rounded-full'
						>
							<IconExternalLink />
						</Button>
					) : null}
					{active ? (
						<Button
							type='button'
							size='icon-xs'
							variant='ghost'
							title='Remove link'
							onClick={remove}
							className='rounded-full'
						>
							<IconTrash />
						</Button>
					) : null}
					<Button
						type='submit'
						variant='secondary'
						size='icon-xs'
						className='rounded-full'
					>
						<IconPlus />
					</Button>
				</form>
			</PopoverContent>
		</Popover>
	)
}
