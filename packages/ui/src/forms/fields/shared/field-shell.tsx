import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel
} from '../../../components/field'
import { cn } from '../../../lib/utils'
import { type AnyFieldApi, useSelector } from '@tanstack/react-form'
import type { PropsWithChildren } from 'react'

/** The `✦` marker shown next to a required field's label — shared by `FieldShell`'s own label rendering and any field that hand-rolls its own label (e.g. `Checkbox`, `Switch`). */
export function RequiredMark() {
	return <span className='text-[5px]! text-destructive ml-1'>✦</span>
}

type FieldShellProps = PropsWithChildren<{
	label?: string
	description?: string
	required?: boolean
	isInvalid: boolean
	field: AnyFieldApi
	orientation?: 'vertical' | 'horizontal' | 'responsive'
	className?: string
}>

/** Field chrome (label/description/error) shared by every field. Named to avoid colliding with `useFieldContext`/`fieldContext` (from `@tanstack/react-form`, re-exported in `forms/context.ts`) — this is a component, not a context. */
export function FieldShell({
	label,
	description,
	required = false,
	orientation,
	isInvalid,
	className,
	field,
	children
}: FieldShellProps) {
	const errors = useSelector(field.store, (state) => state.meta.errors)
	return (
		<Field
			orientation={orientation}
			data-invalid={isInvalid}
			className={cn(className)}
		>
			{label && (
				<FieldLabel htmlFor={field.name}>
					{label}
					{required && <RequiredMark />}
				</FieldLabel>
			)}
			{children}
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	)
}
