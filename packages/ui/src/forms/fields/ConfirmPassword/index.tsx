import { Password } from '../Password'
import type { BaseFieldProps } from '../shared/types'

type ConfirmPasswordProps = BaseFieldProps & {
	placeholder?: string
	className?: string
}

/**
 * Renders exactly like `Password`: the "must match the other password
 * field" rule isn't this component's job. It only ever sees its own
 * field's value (see `Password`'s own doc comment on why cross-field reads
 * aren't in scope here); a consumer's own schema validates the match with
 * a whole-object `.refine()` (already the pattern
 * `www/src/routes/(auth)/auth/create-account.tsx` uses for its own
 * password/repassword pair, outside this generic field system).
 */
export const ConfirmPassword = (props: ConfirmPasswordProps) => (
	<Password {...props} autoComplete='new-password' />
)
