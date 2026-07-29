import { cn } from '@base/ui/lib/utils'
import { t } from '@base/ui/components/sonner'
import { useAppForm } from '@base/ui/forms'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { getAuthClient, unwrap } from '../../db/collections'
import { getAdminConfig } from '../functions/config-registry'
import { AuthBanner } from './auth-banner'

type ForgotPasswordViewProps = {
	title?: string
	/** Defaults to `getAdminConfig()?.adminIcon` — see `LoginView`'s own doc comment. */
	icon?: string
	loginHref?: string
	/**
	 * The path the emailed reset link ultimately lands on — passed straight
	 * through to `authClient.requestPasswordReset({redirectTo})`. Defaults
	 * to the matching sibling route (`ResetPasswordView`'s own).
	 */
	resetPasswordHref?: string
}

const forgotPasswordSchema = z.object({ email: z.email() })

/**
 * One `email` field, calling `authClient.requestPasswordReset(...)`
 * directly — see `LoginView`'s own doc comment for the general boundary
 * this draws around better-auth. Always shows the same confirmation
 * message regardless of whether the email actually exists (standard
 * practice — never reveals account existence).
 */
export function ForgotPasswordView({
	title = 'Forgot password',
	icon = getAdminConfig()?.adminIcon,
	loginHref = '/admin/login',
	resetPasswordHref = '/admin/reset-password'
}: ForgotPasswordViewProps) {
	const authClient = getAuthClient()
	const [sent, setSent] = useState(false)

	const requestReset = useMutation({
		mutationFn: async (email: string) => {
			if (!authClient) {
				throw new Error(
					'ForgotPasswordView was rendered but no `auth` was passed to baseConfig() — see BaseConfigProps["auth"].'
				)
			}
			return unwrap(
				await authClient.requestPasswordReset({
					email,
					redirectTo: resetPasswordHref
				})
			)
		},
		onSuccess: () => setSent(true),
		onError: (error) => {
			t.error(error.name ?? 'Error', { description: error.message })
		}
	})

	const form = useAppForm({
		defaultValues: { email: '' },
		validators: {
			onSubmit: forgotPasswordSchema,
			onChange: forgotPasswordSchema
		},
		onSubmit: async ({ value }) => {
			await requestReset.mutateAsync(value.email)
		}
	})

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
					description={
						sent
							? 'If that email exists, a reset link is on its way.'
							: 'Enter your email and we’ll send you a reset link.'
					}
				/>

				{sent ? (
					<p className='text-center text-sm'>
						<a href={loginHref}>Back to sign in</a>
					</p>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className='flex flex-col gap-5'
					>
						<form.AppField name='email'>
							{(f: any) => (
								<f.Input
									required
									label='Email'
									type='email'
									placeholder='Email address'
								/>
							)}
						</form.AppField>

						<form.AppForm>
							<form.Scribe label='Send reset link' />
						</form.AppForm>

						<p className='text-center text-sm'>
							<a href={loginHref}>Back to sign in</a>
						</p>
					</form>
				)}
			</section>
		</article>
	)
}
