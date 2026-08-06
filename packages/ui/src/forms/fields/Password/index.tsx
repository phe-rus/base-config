import { IconLock } from '@tabler/icons-react'
import { Input } from '../Input'
import type { BaseFieldProps } from '../shared/types'

type PasswordProps = BaseFieldProps & {
	placeholder?: string
	className?: string
	autoComplete?: string
	dir?: 'ltr' | 'rtl' | 'auto'
}

/** A preset `Input` (`type='password'`, already gives the show/hide toggle `Input` itself implements), lock icon. A distinct, discoverable field type rather than every consumer remembering to pass `type='password'` to a plain `Input`. */
export const Password = ({ autoComplete, ...props }: PasswordProps) => (
	<Input
		{...props}
		type='password'
		Icon={IconLock}
		autoComplete={autoComplete ?? 'new-password'}
	/>
)
