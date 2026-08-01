import type { BaseFieldProps } from '../shared/types'
import { useFieldState } from '../shared/use-field-state'

type HiddenProps = Pick<BaseFieldProps, 'required' | 'disabled'>

/** No `FieldShell` chrome: carries a value with nothing rendered visibly, e.g. a server-assigned id or a value set by another part of the UI rather than typed directly. */
export const Hidden = ({ required, disabled }: HiddenProps) => {
	const { name, value } = useFieldState<string>()

	return (
		<input
			type='hidden'
			name={name}
			value={value ?? ''}
			required={required}
			disabled={disabled}
		/>
	)
}
