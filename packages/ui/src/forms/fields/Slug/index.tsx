import { IconLink } from '@tabler/icons-react'
import { Input } from '../Input'
import type { BaseFieldProps } from '../shared/types'

type SlugProps = BaseFieldProps & {
	placeholder?: string
	className?: string
}

/** A preset `Input` (link icon, no separate value handling). Auto-deriving from a sibling title field isn't done here: this component only ever sees its own field's value/context (see `useFieldState`'s own scope), not a sibling's; that kind of cross-field sync is a consumer-level concern (already handled that way for `pages`/`posts`/`policies` in `www/src/config`). */
export const Slug = (props: SlugProps) => (
	<Input {...props} type='text' Icon={IconLink} autoComplete='off' />
)
