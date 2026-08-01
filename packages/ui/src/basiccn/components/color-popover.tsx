import { Button } from '../../components/button'
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger
} from '../../components/popover'
import { cn } from '../../lib/utils'
import { IconPlus, type Icon } from '@tabler/icons-react'
import { type FC } from 'react'
import type { Swatch } from '../utils/colors'

interface ColorPopoverProps {
	icon: Icon
	label: string
	swatches: Swatch[]
	activeValue?: string
	onPick: (value: string) => void
}

/**
 * A single icon button (sits inline in a bubble-menu-style row, same as
 * Bold/Italic/etc.) whose click opens a small popover holding the actual
 * swatch grid: the "more options" for that one control, not a whole
 * separate settings panel.
 */
export const ColorPopover: FC<ColorPopoverProps> = ({
	icon: IconComponent,
	label,
	swatches,
	activeValue,
	onPick
}) => {
	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						size='icon'
						variant='ghost'
						className='rounded-full!'
						title={label}
					/>
				}
			>
				<IconComponent className='dualTone' />
			</PopoverTrigger>
			<PopoverContent
				align='center'
				sideOffset={6}
				className={cn(
					'w-fit gap-2 rounded-lg',
					'border border-input/25 bg-popover p-2 text-xs shadow-md ring-1 ring-foreground/10'
				)}
			>
				<PopoverTitle className='px-0.5 text-xs font-medium'>
					{label}
				</PopoverTitle>
				<div className='grid grid-cols-5 gap-1.5'>
					{swatches.map((swatch) => (
						<button
							key={swatch.label}
							type='button'
							title={swatch.label}
							onClick={() => onPick(swatch.value)}
							className={cn(
								'size-5 shrink-0 rounded-full border border-input/35',
								!swatch.value && 'bg-input/35',
								(activeValue ?? '') === swatch.value &&
									'ring-2 ring-ring ring-offset-1 ring-offset-popover'
							)}
							style={swatch.value ? { background: swatch.value } : undefined}
						/>
					))}
					<label
						title='Custom color'
						className={cn(
							'relative flex size-5 shrink-0 items-center justify-center',
							'rounded-full border border-dashed border-input/50 cursor-pointer'
						)}
					>
						<input
							type='color'
							defaultValue='#808080'
							onChange={(event) => onPick(event.target.value)}
							className='absolute inset-0 size-full cursor-pointer opacity-0'
						/>
						<IconPlus className='pointer-events-none size-3 text-muted-foreground' />
					</label>
				</div>
			</PopoverContent>
		</Popover>
	)
}
