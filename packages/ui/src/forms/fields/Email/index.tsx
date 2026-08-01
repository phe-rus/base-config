import { IconMail } from '@tabler/icons-react'
import { Input } from '../Input'
import type { BaseFieldProps } from '../shared/types'

type EmailProps = BaseFieldProps & {
	placeholder?: string
	className?: string
	autoComplete?: string
}

/** A preset `Input` (`type='email'`, mail icon), not a separate implementation. Reads/writes the same field context `Input` does (`useFieldState()` resolves by the enclosing `form.AppField`, not by which component calls it), so wrapping is safe. */
export const Email = ({ autoComplete, ...props }: EmailProps) => (
	<Input
		{...props}
		type='email'
		Icon={IconMail}
		autoComplete={autoComplete ?? 'email'}
	/>
)
