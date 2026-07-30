import { Button } from '@baseconfig/ui/components/button'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle
} from '@baseconfig/ui/components/drawer'
import { cn } from '@baseconfig/ui/lib/utils'
import type { PropsWithChildren, ReactNode } from 'react'

type WidgetDialogProps = PropsWithChildren<{
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	/** Rendered inside `<Drawer>`, before the content — e.g. a self-triggered widget's own opener button. Omit for an externally-controlled widget (`open`/`onOpenChange` driven by the caller, no built-in trigger). */
	trigger?: ReactNode
	/** Extra footer action(s), rendered after the always-present Cancel button — e.g. a widget's own primary "Create"/"Save" button. */
	footer?: ReactNode
}>

/**
 * The shared chrome behind every `admin/widgets/*` — a small, focused
 * action surface (as opposed to a full-page `admin/views/*`). Extracted
 * after `AuthWidget` and `StorageWidget` turned out to have byte-for-byte
 * identical Header/Footer/sizing, same as `DocumentHeader` did for
 * `CollectionForm`/`GlobalForm`. Built on `Drawer`, not `Dialog` —
 * `AuthWidget` (originally `CreateUserDialog`) used `Dialog` before this
 * extraction; converted to `Drawer` deliberately, so every widget shares
 * one real primitive instead of two visually different ones.
 */
export function WidgetDialog({
	open,
	onOpenChange,
	title,
	description,
	trigger,
	footer,
	children
}: WidgetDialogProps) {
	return (
		<Drawer
			showSwipeHandle
			modal='trap-focus'
			open={open}
			onOpenChange={onOpenChange}
		>
			{trigger}
			<DrawerContent className='sm:max-w-sm bg-background rounded'>
				<DrawerHeader className='items-start w-full gap-0!'>
					<DrawerTitle className='text-base justify-start'>{title}</DrawerTitle>
					<DrawerDescription className='text-xs text-left md:max-w-xs leading-none'>
						{description}
					</DrawerDescription>
				</DrawerHeader>

				<div
					className={cn(
						'flex flex-col gap-3 overflow-y-auto p-4',
						'no-scrollbar'
					)}
				>
					{children}
				</div>

				<DrawerFooter>
					<Button
						type='button'
						variant='ghost'
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					{footer}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
