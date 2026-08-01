import { Button } from '../../components/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from '../../components/select'
import { cn } from '../../lib/utils'
import {
	IconAlignCenter,
	IconAlignJustified,
	IconAlignLeft,
	IconAlignRight,
	IconBold,
	IconBraces,
	IconH1,
	IconH2,
	IconH3,
	IconH4,
	IconH5,
	IconH6,
	IconItalic,
	IconList,
	IconListCheck,
	IconListDetails,
	IconPageBreak,
	IconQuote,
	IconStrikethrough,
	IconSubscript,
	IconSuperscript,
	IconTextPlus,
	type Icon
} from '@tabler/icons-react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'
import { useCallback, useMemo, useRef, type FC } from 'react'
import { LinkPopover } from './link-popover'
import { MoreMenu } from './more-menu'

type ShouldShow = NonNullable<BubbleMenuProps['shouldShow']>

type BubblemenuProps = {
	editor: Editor
}

type FormatingList = {
	label: string
	items: {
		label: string
		value: string
		status: boolean
		Icon: Icon
		press: () => boolean
	}[]
}

export const BubbleMenus: FC<BubblemenuProps> = ({ editor }) => {
	// Popover/Select content renders through a portal, outside this bubble
	// menu's own DOM subtree: tiptap's default `shouldShow` hides the menu
	// on editor blur unless the mousedown target is a DOM descendant of the
	// menu element, which portaled content never is. Without this override,
	// opening any nested popover (link, colors, font) blurs the editor,
	// hides (unmounts) the whole bar mid-interaction, and the popover's
	// anchor disappears with it, which is what shows up as the popover
	// "jumping" to a corner of the screen. `pinnedCount` keeps the bar
	// (and everything nested in it) visible while any of its own popovers
	// are open, regardless of editor focus.
	const pinnedCount = useRef(0)
	const pin = useCallback((open: boolean) => {
		pinnedCount.current = Math.max(0, pinnedCount.current + (open ? 1 : -1))
	}, [])
	const shouldShow = useCallback<ShouldShow>(({ editor, state }) => {
		if (pinnedCount.current > 0) return true
		return editor.isEditable && !state.selection.empty
	}, [])

	const state = useEditorState({
		editor,
		selector: (ctx) => ({
			diff_gen: {
				isBold: ctx.editor.isActive('bold'),
				isItalic: ctx.editor.isActive('italic'),
				isStrikethrough: ctx.editor.isActive('strike'),
				isQuote: ctx.editor.isActive('blockquote'),
				isCode: ctx.editor.isActive('code'),
				isSubscript: ctx.editor.isActive('subscript'),
				isSuperscript: ctx.editor.isActive('superscript'),
				isHardBreak: ctx.editor.isActive('hardBreak'),
				isLink: ctx.editor.isActive('link')
			},
			formating: {
				isParagraph: ctx.editor.isActive('paragraph'),
				isHeading1: ctx.editor.isActive('heading', { level: 1 }),
				isHeading2: ctx.editor.isActive('heading', { level: 2 }),
				isHeading3: ctx.editor.isActive('heading', { level: 3 }),
				isHeading4: ctx.editor.isActive('heading', { level: 4 }),
				isHeading5: ctx.editor.isActive('heading', { level: 5 }),
				isHeading6: ctx.editor.isActive('heading', { level: 6 }),
				isBulletList: ctx.editor.isActive('bulletList'),
				isOrderedList: ctx.editor.isActive('orderedList'),
				isTaskList: ctx.editor.isActive('taskList')
			},
			alignment: {
				isAlignLeft: ctx.editor.isActive({ textAlign: 'left' }),
				isAlignCenter: ctx.editor.isActive({ textAlign: 'center' }),
				isAlignRight: ctx.editor.isActive({ textAlign: 'right' }),
				isAlignJustify: ctx.editor.isActive({ textAlign: 'justify' })
			}
		})
	})

	const general = useMemo(() => {
		return [
			{
				label: 'Bold',
				Icon: IconBold,
				status: state?.diff_gen.isBold,
				press: () => editor.chain().focus().toggleBold().run()
			},
			{
				label: 'Italic',
				Icon: IconItalic,
				status: state?.diff_gen.isItalic,
				press: () => editor.chain().focus().toggleItalic().run()
			},
			{
				label: 'Strikethrough',
				Icon: IconStrikethrough,
				status: state?.diff_gen.isStrikethrough,
				press: () => editor.chain().focus().toggleStrike().run()
			},
			{
				label: 'Quote',
				Icon: IconQuote,
				status: state?.diff_gen.isQuote,
				press: () => editor.chain().focus().toggleBlockquote().run()
			},
			{
				label: 'Code',
				Icon: IconBraces,
				status: state?.diff_gen.isCode,
				press: () => editor.chain().focus().toggleCode().run()
			},
			{
				label: 'Subscript',
				Icon: IconSubscript,
				status: state?.diff_gen.isSubscript,
				press: () => editor.chain().focus().toggleSubscript().run()
			},
			{
				label: 'Superscript',
				Icon: IconSuperscript,
				status: state?.diff_gen.isSuperscript,
				press: () => editor.chain().focus().toggleSuperscript().run()
			},
			{
				label: 'Hard Break',
				Icon: IconPageBreak,
				status: state?.diff_gen.isHardBreak,
				press: () => editor.chain().focus().setHardBreak().run()
			}
		]
	}, [state, editor])

	const listItems = useMemo(() => {
		return [
			{
				label: 'Formating',
				items: [
					{
						label: 'Paragraph',
						value: 'paragraph',
						status: state?.formating.isParagraph,
						Icon: IconTextPlus,
						press: () => editor.chain().focus().setParagraph().run()
					},
					{
						label: 'Heading 1',
						value: 'heading1',
						status: state?.formating.isHeading1,
						Icon: IconH1,
						press: () =>
							editor.chain().focus().toggleHeading({ level: 1 }).run()
					},
					{
						label: 'Heading 2',
						value: 'heading2',
						status: state?.formating.isHeading2,
						Icon: IconH2,
						press: () =>
							editor.chain().focus().toggleHeading({ level: 2 }).run()
					},
					{
						label: 'Heading 3',
						value: 'heading3',
						status: state?.formating.isHeading3,
						Icon: IconH3,
						press: () =>
							editor.chain().focus().toggleHeading({ level: 3 }).run()
					},
					{
						label: 'Heading 4',
						status: state?.formating.isHeading4,
						value: 'heading4',
						Icon: IconH4,
						press: () =>
							editor.chain().focus().toggleHeading({ level: 4 }).run()
					},
					{
						label: 'Heading 5',
						value: 'heading5',
						status: state?.formating.isHeading5,
						Icon: IconH5,
						press: () =>
							editor.chain().focus().toggleHeading({ level: 5 }).run()
					},
					{
						label: 'Heading 6',
						value: 'heading6',
						status: state?.formating.isHeading6,
						Icon: IconH6,
						press: () =>
							editor.chain().focus().toggleHeading({ level: 6 }).run()
					}
				]
			},
			{
				label: 'Lists',
				items: [
					{
						label: 'Bullet List',
						value: 'bulletList',
						status: state?.formating.isBulletList,
						Icon: IconList,
						press: () => editor.chain().focus().toggleBulletList().run()
					},
					{
						label: 'Ordered List',
						value: 'orderedList',
						status: state?.formating.isOrderedList,
						Icon: IconListDetails,
						press: () => editor.chain().focus().toggleOrderedList().run()
					},
					{
						label: 'Task List',
						value: 'taskList',
						status: state?.formating.isTaskList,
						Icon: IconListCheck,
						press: () => editor.chain().focus().toggleTaskList().run()
					}
				]
			},
			{
				label: 'Alignment',
				items: [
					{
						label: 'Left',
						value: 'left',
						status: state?.alignment.isAlignLeft,
						Icon: IconAlignLeft,
						press: () => editor.chain().focus().setTextAlign('left').run()
					},
					{
						label: 'Center',
						value: 'center',
						status: state?.alignment.isAlignCenter,
						Icon: IconAlignCenter,
						press: () => editor.chain().focus().setTextAlign('center').run()
					},
					{
						label: 'Right',
						value: 'right',
						status: state?.alignment.isAlignRight,
						Icon: IconAlignRight,
						press: () => editor.chain().focus().setTextAlign('right').run()
					},
					{
						label: 'Justify',
						value: 'justify',
						status: state?.alignment.isAlignJustify,
						Icon: IconAlignJustified,
						press: () => editor.chain().focus().setTextAlign('justify').run()
					}
				]
			}
		] satisfies FormatingList[]
	}, [state, editor])

	const selectedValue = useMemo(() => {
		return (
			listItems
				.find((g) => g.items.some((i) => i.status))
				?.items.find((i) => i.status)?.value || 'paragraph'
		)
	}, [listItems])

	return (
		<BubbleMenu
			editor={editor}
			shouldShow={shouldShow}
			options={{
				autoPlacement: true,
				placement: 'bottom',
				offset: 8,
				flip: true
			}}
			className='flex items-center overflow-hidden xs:max-w-xs'
		>
			<section
				className={cn(
					'flex items-center gap-2 rounded-sm shadow',
					'bg-popover backdrop-blur px-3 py-1',
					'border border-input/25 text-xs max-w-full',
					'overflow-x-auto no-scrollbar truncate'
				)}
			>
				<span className='font-bold'>Pherus</span>
				<span className='bg-popover-foreground/15 w-[0.1px] h-5' />
				<div className='flex items-center gap-px'>
					{general.map((i) => {
						const { label, Icon, status: st, press } = i
						return (
							<Button
								key={label}
								size='icon'
								variant={st ? 'secondary' : 'ghost'}
								className='rounded-full!'
								onClick={() => press()}
								title={label}
							>
								<Icon className='dualTone' />
							</Button>
						)
					})}
				</div>
				<span className='bg-popover-foreground/15 w-[0.1px] h-5' />
				<div className='flex items-center gap-px'>
					<Select
						defaultValue='paragraph'
						value={selectedValue}
						items={listItems}
					>
						<SelectTrigger size='sm' className='border-0 text-xs'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent
							align='end'
							alignItemWithTrigger={false}
							className='no-scrollbar'
						>
							<section
								className={cn(
									'flex flex-col gap-2 max-h-[30svh] overflow-y-auto',
									'no-scrollbar'
								)}
							>
								{listItems.map((group) => {
									const { items, label } = group
									return (
										<SelectGroup key={label}>
											<SelectLabel>{label}</SelectLabel>
											{items.map((i) => {
												const { value, press, Icon, label } = i
												return (
													<SelectItem
														key={label}
														value={value}
														onClick={() => press()}
														className='group'
													>
														<div className='flex items-center gap-2'>
															<Icon className='dualTone' />
															<span className='text-xs'>{label}</span>
														</div>
													</SelectItem>
												)
											})}
										</SelectGroup>
									)
								})}
							</section>
						</SelectContent>
					</Select>
				</div>
				<span className='bg-popover-foreground/15 w-[0.1px] h-5' />
				<div className='flex items-center gap-px'>
					<LinkPopover
						editor={editor}
						active={state?.diff_gen.isLink ?? false}
						onPinChange={pin}
					/>
					<MoreMenu editor={editor} onPinChange={pin} />
				</div>
			</section>
		</BubbleMenu>
	)
}
