import { useKeywordSuggestions } from '../../../db/collections'
import type { KeywordsFieldConfig } from '../../../fields/types'

type KeywordsFieldProps = {
	/** The consumer's `useAppForm` instance, same `form` `renderField` itself is handed. */
	form: any
	/** The resolved dotted path to this field's value, see `renderField`'s own `name` computation (`fields/renderer.tsx`). */
	name: string
	field: KeywordsFieldConfig
}

/**
 * The framework-owned implementation of every `type: 'keywords'` field, the
 * one place `@baseconfig/core` wires the shared keyword pool into the
 * generic `KeywordsInput` primitive (see `fields/renderer.tsx`'s own
 * `FieldRenderers` doc comment for why `keywords` isn't a consumer-supplied
 * resolver): `useKeywordSuggestions(field.relationTo)` supplies the live
 * suggestion pool and the `onCreate` that registers new keywords into it.
 * Renders its own `form.AppField` (it has a real field `value` to read and
 * write), so the renderer special-cases it before the generic leaf-field
 * `form.AppField` wrapper, the same way `relationship` is.
 */
export function KeywordsField({ form, name, field }: KeywordsFieldProps) {
	const { suggestions, onCreate } = useKeywordSuggestions(field.relationTo)

	return (
		<form.AppField name={name}>
			{(f: any) => (
				<f.KeywordsInput
					label={field.label}
					description={field.admin?.description}
					placeholder={field.placeholder}
					required={field.required}
					disabled={field.disabled}
					suggestions={suggestions}
					onCreate={onCreate}
				/>
			)}
		</form.AppField>
	)
}
