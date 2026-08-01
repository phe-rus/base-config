import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '../../../components/input-group'
import { cn } from '../../../lib/utils'
import { IconHash } from '@tabler/icons-react'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type NumberProps = BaseFieldProps & {
	placeholder?: string
	min?: number
	max?: number
	step?: number
	className?: string
}

/**
 * Its own implementation, not a preset `Input`: a native `<input>`'s
 * `value`/`e.target.value` is always a string even with `type='number'`,
 * so this field's own `value: number` (matching Payload's own Number
 * field's real output type) needs `e.target.valueAsNumber`, not `Input`'s
 * `useFieldState<string>()`.
 */
export const Number = ({
	label,
	description,
	placeholder,
	required,
	disabled,
	className,
	min,
	max,
	step
}: NumberProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<number | undefined>()

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
			className={cn(className)}
		>
			<InputGroup aria-required={required} aria-disabled={disabled}>
				<InputGroupInput
					placeholder={placeholder}
					id={name}
					name={name}
					value={value ?? ''}
					min={min}
					max={max}
					step={step}
					onBlur={handleBlur}
					onChange={(e) => {
						// `Number` here would refer to this component itself, not the
						// global constructor: this component's own export name
						// shadows it for the whole module. `globalThis.Number` sidesteps that.
						const raw = e.target.valueAsNumber
						handleChange(globalThis.Number.isNaN(raw) ? undefined : raw)
					}}
					aria-invalid={isInvalid}
					type='number'
					required={required}
					disabled={disabled}
				/>
				<InputGroupAddon align='inline-start'>
					<IconHash />
				</InputGroupAddon>
			</InputGroup>
		</FieldShell>
	)
}
