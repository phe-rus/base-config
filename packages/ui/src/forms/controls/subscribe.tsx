import { Button } from '../../components/button'
import { IconLoader2 } from '@tabler/icons-react'
import type { ComponentProps } from 'react'
import { useFormContext } from '../context'

type SubscribeProps = {
	label: string
} & Omit<ComponentProps<typeof Button>, 'children' | 'type'>

export function Subscribe({ label, ...props }: SubscribeProps) {
	const form = useFormContext()
	return (
		<form.Subscribe
			selector={(state) => [
				state.isSubmitting,
				state.canSubmit,
				state.isDirty,
				state.isTouched
			]}
		>
			{([isSubmitting, canSubmit, isDirty, isTouched]) => {
				const isDisabled = isSubmitting || !canSubmit || !isDirty || !isTouched

				return (
					<Button type='submit' disabled={isDisabled} {...props}>
						{isSubmitting && (
							<IconLoader2 className='animate-spin duration-300' />
						)}
						{label}
					</Button>
				)
			}}
		</form.Subscribe>
	)
}
