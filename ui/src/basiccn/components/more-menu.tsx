import { Button } from '../../components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '../../components/popover'
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '../../components/combobox'
import { cn } from '../../lib/utils'
import {
	IconCode,
	IconDots,
	IconHighlight,
	IconIndentDecrease,
	IconIndentIncrease,
	IconPalette
} from '@tabler/icons-react'
import { useEditorState, type Editor } from '@tiptap/react'
import { useMemo, type FC } from 'react'
import {
	fontFamilies,
	highlightColors,
	textColors,
	type Swatch
} from '../utils/colors'
import { ColorPopover } from './color-popover'

interface MoreMenuProps {
	editor: Editor
	onPinChange: (open: boolean) => void
}

export const MoreMenu: FC<MoreMenuProps> = ({ editor, onPinChange }) => {
	const state = useEditorState({
		editor,
		selector: (ctx) => ({
			color: ctx.editor.getAttributes('textStyle').color as string | undefined,
			highlight: ctx.editor.getAttributes('highlight').color as
				| string
				| undefined,
			fontFamily: ctx.editor.getAttributes('textStyle').fontFamily as
				| string
				| undefined,
			isCodeBlock: ctx.editor.isActive('codeBlock')
		})
	})

	const selectedFont = useMemo(
		() => fontFamilies.find((font) => font.value === state?.fontFamily) ?? null,
		[state?.fontFamily]
	)

	return (
		<Popover onOpenChange={onPinChange}>
			<PopoverTrigger
				render={
					<Button
						size='icon'
						variant='ghost'
						className='rounded-full!'
						title='More'
					/>
				}
			>
				<IconDots className='dualTone' />
			</PopoverTrigger>
			{/* Same bubble-menu-bar look as the primary row (pill, backdrop-blur,
			    dividers) — this is a second bar, not a settings card. */}
			<PopoverContent
				align='end'
				sideOffset={8}
				className={cn(
					'flex flex-row w-fit items-center gap-2 rounded-sm shadow',
					'bg-popover backdrop-blur px-3 py-1',
					'border border-input/25 text-xs max-w-full',
					'overflow-x-auto no-scrollbar'
				)}
			>
				<div className='flex items-center gap-px'>
					<ColorPopover
						icon={IconPalette}
						label='Text color'
						swatches={textColors}
						activeValue={state?.color}
						onPick={(value) => {
							if (!value) editor.chain().focus().unsetColor().run()
							else editor.chain().focus().setColor(value).run()
						}}
					/>
					<ColorPopover
						icon={IconHighlight}
						label='Highlight'
						swatches={highlightColors}
						activeValue={state?.highlight}
						onPick={(value) => {
							if (!value) editor.chain().focus().unsetHighlight().run()
							else editor.chain().focus().setHighlight({ color: value }).run()
						}}
					/>
				</div>
				<span className='bg-popover-foreground/15 w-[0.1px] h-5' />
				<div className='flex items-center gap-px'>
					<Combobox<Swatch>
						items={fontFamilies}
						value={selectedFont}
						itemToStringLabel={(item) => item.label}
						onValueChange={(item) => {
							const next = item?.value ?? ''
							if (!next) editor.chain().focus().unsetFontFamily().run()
							else editor.chain().focus().setFontFamily(next).run()
						}}
					>
						<ComboboxInput
							placeholder='Font'
							className='h-6.5 w-28 border-0 bg-transparent px-1.5 text-xs shadow-none'
						/>
						<ComboboxContent align='end'>
							<ComboboxEmpty>No fonts found.</ComboboxEmpty>
							<ComboboxList>
								{fontFamilies.map((font) => (
									<ComboboxItem key={font.label} value={font}>
										<span
											style={
												font.value ? { fontFamily: font.value } : undefined
											}
										>
											{font.label}
										</span>
									</ComboboxItem>
								))}
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</div>
				<span className='bg-popover-foreground/15 w-[0.1px] h-5' />
				<div className='flex items-center gap-px'>
					<Button
						size='icon'
						variant='ghost'
						className='rounded-full!'
						title='Decrease indent'
						onClick={() => editor.chain().focus().outdent().run()}
					>
						<IconIndentDecrease className='dualTone' />
					</Button>
					<Button
						size='icon'
						variant='ghost'
						className='rounded-full!'
						title='Increase indent'
						onClick={() => editor.chain().focus().indent().run()}
					>
						<IconIndentIncrease className='dualTone' />
					</Button>
					<Button
						size='icon'
						variant={state?.isCodeBlock ? 'secondary' : 'ghost'}
						className='rounded-full!'
						title='Code block'
						onClick={() => editor.chain().focus().toggleCodeBlock().run()}
					>
						<IconCode className='dualTone' />
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
