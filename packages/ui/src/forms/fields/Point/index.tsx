import { InputGroup, InputGroupInput } from '../../../components/input-group'
import { cn } from '../../../lib/utils'
import { FieldShell } from '../shared/field-shell'
import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

export type PointValue = { lat: number | undefined; lng: number | undefined }

type PointProps = BaseFieldProps & {
	className?: string
}

/** One field value, `{lat, lng}`: two coupled numeric inputs, not two separate fields, so the pair always commits together. */
export const Point = ({
	label,
	description,
	required,
	disabled,
	className
}: PointProps) => {
	const { field, name, value, isInvalid, handleBlur, handleChange } =
		useFieldState<PointValue | undefined>()

	const point = value ?? { lat: undefined, lng: undefined }

	const parse = (raw: number) =>
		globalThis.Number.isNaN(raw) ? undefined : raw

	return (
		<FieldShell
			required={required}
			label={label}
			description={description}
			field={field}
			isInvalid={isInvalid}
			className={cn('flex flex-col gap-2', className)}
		>
			<div className='flex gap-2'>
				<InputGroup aria-required={required} aria-disabled={disabled}>
					<InputGroupInput
						id={`${name}-lat`}
						name={`${name}-lat`}
						placeholder='Latitude'
						value={point.lat ?? ''}
						type='number'
						step='any'
						onBlur={handleBlur}
						onChange={(e) =>
							handleChange({ ...point, lat: parse(e.target.valueAsNumber) })
						}
						aria-invalid={isInvalid}
						required={required}
						disabled={disabled}
					/>
				</InputGroup>
				<InputGroup aria-required={required} aria-disabled={disabled}>
					<InputGroupInput
						id={`${name}-lng`}
						name={`${name}-lng`}
						placeholder='Longitude'
						value={point.lng ?? ''}
						type='number'
						step='any'
						onBlur={handleBlur}
						onChange={(e) =>
							handleChange({ ...point, lng: parse(e.target.valueAsNumber) })
						}
						aria-invalid={isInvalid}
						required={required}
						disabled={disabled}
					/>
				</InputGroup>
			</div>
		</FieldShell>
	)
}
