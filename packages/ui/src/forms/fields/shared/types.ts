/** Shared by every field — the props that don't vary by field type. */
export interface BaseFieldProps {
	label?: string
	description?: string
	required?: boolean
	disabled?: boolean
}

/** Shared option shape for any field backed by a fixed list of choices (`Select`, `RadioGroup`, `Combobox`). */
export interface SelectOption {
	label: string
	value: string
}
