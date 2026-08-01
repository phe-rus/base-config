import { useFieldContext } from '../../context'

/** Every field needs its `tanstack/react-form` field instance, current value, and touched+invalid state; this was hand-repeated in each field before. */
export function useFieldState<T>() {
	const field = useFieldContext<T>()
	const { name, state, handleBlur, handleChange } = field
	const isInvalid = state.meta.isTouched && !state.meta.isValid

	return {
		field,
		name,
		value: state.value,
		isInvalid,
		handleBlur,
		handleChange
	}
}
