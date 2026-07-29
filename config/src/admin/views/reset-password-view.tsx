import { cn } from '@base/ui/lib/utils'
import { t } from '@base/ui/components/sonner'
import { useAppForm } from '@base/ui/forms'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getAuthClient, unwrap } from '../../db/collections'
import { AuthBanner } from './auth-banner'

type ResetPasswordViewProps = {
	title?: string
	/** e.g. a consumer's own `config.adminIcon` (`AdminSettings`) — omit for no icon. */
	icon?: string
	/** The `?token=` query param better-auth's reset-password email link appends — the route reads this from its own search params and passes it through. `undefined` (no token in the URL) shows an error state instead of a form. */
	token: string | undefined
	loginHref?: string
	forgotPasswordHref?: string
}

const resetPasswordSchema = z
	.object({
		newPassword: z
			.string()
			.min(8, 'Password must be at least 8 characters long')
			.max(128, 'Password must be at most 128 characters long'),
		confirmPassword: z.string()
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

/**
 * The other half of `ForgotPasswordView` — takes the `token` from the
 * emailed reset link's own `?token=` query param (read by the route,
 * passed in as a prop, since this component itself has no router
 * dependency) and calls `authClient.resetPassword({newPassword, token})`
 * directly.
 */
export function ResetPasswordView({
	title = 'Reset password',
	icon,
	token,
	loginHref = '/admin/login',
	forgotPasswordHref = '/admin/forgot-password'
}: ResetPasswordViewProps) {
	const authClient = getAuthClient()
	const navigate = useNavigate()

	const resetPassword = useMutation({
		mutationFn: async (newPassword: string) => {
			if (!authClient) {
				throw new Error(
					'ResetPasswordView was rendered but no `auth` was passed to baseConfig() — see BaseConfigProps["auth"].'
				)
			}
			if (!token) {
				throw new Error('This reset link is missing its token.')
			}
			return unwrap(await authClient.resetPassword({ newPassword, token }))
		},
		onSuccess: () => {
			t.success('Success', { description: 'Password reset — sign in below' })
			navigate({ to: '/admin/login', replace: true })
		},
		onError: (error) => {
			t.error(error.name ?? 'Error', { description: error.message })
		}
	})

	const form = useAppForm({
		defaultValues: { newPassword: '', confirmPassword: '' },
		validators: {
			onSubmit: resetPasswordSchema,
			onChange: resetPasswordSchema
		},
		onSubmit: async ({ value }) => {
			await resetPassword.mutateAsync(value.newPassword)
		}
	})

	if (!token) {
		return (
			<article className='flex flex-col min-h-svh'>
				<section
					className={cn(
						'container flex flex-col gap-5 w-full',
						'md:max-w-sm m-auto py-32 typeset-a:underline!',
						'typeset-a:decoration-wavy'
					)}
				>
					<AuthBanner
						title={title}
						icon={icon}
						description='This reset link is invalid or has expired.'
					/>
					<p className='text-center text-sm'>
						<a href={forgotPasswordHref}>Request a new reset link</a>
					</p>
				</section>
			</article>
		)
	}

	return (
		<article className='flex flex-col min-h-svh'>
			<section
				className={cn(
					'container flex flex-col gap-5 w-full',
					'md:max-w-sm m-auto py-32 typeset-a:underline!',
					'typeset-a:decoration-wavy'
				)}
			>
				<AuthBanner
					title={title}
					icon={icon}
					description='Choose a new password for your account.'
				/>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className='flex flex-col gap-5'
				>
					<form.AppField name='newPassword'>
						{(f: any) => (
							<f.Input
								required
								label='New password'
								type='password'
								placeholder='New password'
							/>
						)}
					</form.AppField>

					<form.AppField name='confirmPassword'>
						{(f: any) => (
							<f.Input
								required
								label='Confirm password'
								type='password'
								placeholder='Confirm password'
							/>
						)}
					</form.AppField>

					<form.AppForm>
						<form.Scribe label='Reset password' />
					</form.AppForm>

					<p className='text-center text-sm'>
						<a href={loginHref}>Back to sign in</a>
					</p>
				</form>
			</section>
		</article>
	)
}
