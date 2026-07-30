import { Button } from '../../../components/button'
import { cn } from '../../../lib/utils'
import { TanstackImage } from '../../../image'
import { IconX } from '@tabler/icons-react'
import type { ComponentPropsWithRef, DragEventHandler } from 'react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type UploadHookConfig = {
	path?: string
	mimetype?: string
	compress?: { maxWidth?: number; maxHeight?: number; quality?: number } | false
	onSuccess?: (files: { size: number; to: string }[]) => void
}

type UploadHookResult = {
	ref: (node: HTMLElement | null) => void
	input: {
		onDragOver?: DragEventHandler<HTMLElement>
		onDragLeave?: DragEventHandler<HTMLElement>
		onDrop?: DragEventHandler<HTMLElement>
	}
}

/** The actual upload implementation (talks to the app's storage API) lives in the consuming app, not this package — inject it here instead of importing it. */
export type UseUploadHook = (config: UploadHookConfig) => UploadHookResult

type MediaProps = BaseFieldProps & {
	useUpload: UseUploadHook
	path?: string
	mimetype?: string
	compress?: UploadHookConfig['compress']
} & Omit<
		ComponentPropsWithRef<'div'>,
		'ref' | 'onDragOver' | 'onDragLeave' | 'onDrop'
	>

export const Media = ({
	label,
	description,
	required,
	disabled,
	useUpload,
	path,
	mimetype = 'image/*',
	compress = { maxWidth: 512, quality: 0.8 },
	...props
}: MediaProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<{
			to?: string
			size?: string
		}>()

	const { ref, input } = useUpload({
		path,
		mimetype,
		compress,
		onSuccess: (files) => {
			handleChange({
				size: `${files[0]?.size ?? undefined}`,
				to: files[0]?.to ?? undefined
			})
		}
	})

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
		>
			<div
				ref={ref}
				onBlur={handleBlur}
				{...input}
				className={cn(
					'relative flex items-center gap-1 overflow-hidden',
					'bg-input/35 rounded-sm prose-headings:m-0',
					'prose-p:m-0 border border-border/55 cursor-pointer',
					'shadow-sm hover:shadow-md transition-shadow'
				)}
				{...props}
			>
				<section className='relative aspect-auto'>
					<TanstackImage
						src={value?.to ?? '/placeholder.jpg'}
						alt={name}
						className='h-12'
					/>
				</section>
				<div className='flex flex-col p-1'>
					<label>{value?.to ?? label}</label>
					<span className='text-muted-foreground text-xs'>
						{((value?.size ? parseInt(value.size) : 0) / 1024).toFixed(0)} KB
					</span>
				</div>
				<div className='absolute top-1 right-1'>
					<Button
						size='icon-xs'
						variant='destructive'
						type='button'
						disabled={disabled}
						onClick={(e) => {
							e.stopPropagation()
							field.clearValues()
						}}
						className='cursor-pointer'
					>
						<IconX />
					</Button>
				</div>
			</div>
		</FieldShell>
	)
}
