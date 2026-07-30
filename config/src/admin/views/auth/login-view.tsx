import { useAppForm } from '@baseconfig/ui/forms'
import { cn } from '@baseconfig/ui/lib/utils'
import { t } from '@baseconfig/ui/components/sonner'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { getAuthClient, unwrap } from '../../../db/collections'
import { getAdminConfig } from '../../functions/config-registry'
import { AuthBanner } from './auth-banner'

export type LoginFormValues = {
	credentials: string
	password: string
	rememberMe: boolean
}

type LoginViewProps = {
	title?: string
	/** Defaults to `getAdminConfig()?.adminIcon` (set once via `baseConfig({config: {adminIcon}})`) — pass explicitly only to override that app-wide default for this one screen. Omit both for no icon. */
	icon?: string
	createAccountHref?: string
	forgotPasswordHref?: string
	termsHref?: string
	privacyHref?: string
	/**
	 * Defaults to `getAdminConfig()?.socialProviders` — not introspectable
	 * from the client object (social providers are configured server-side,
	 * with real secrets, and better-auth's client has no "list configured
	 * providers" endpoint), so a consumer states them once in `baseConfig()`'s
	 * own `config.socialProviders` rather than per-screen. Pass explicitly
	 * only to override that for this one screen; `[]` forces no buttons.
	 */
	socialProviders?: string[]
}

const loginSchema = z.object({
	credentials: z.string().min(1, 'Required'),
	password: z.string().min(1, 'Required'),
	rememberMe: z.boolean()
})

const otpSchema = z.object({
	code: z.string().min(6, 'Enter the 6-digit code')
})

const defaultValues: LoginFormValues = {
	credentials: '',
	password: '',
	rememberMe: true
}

function providerLabel(provider: string): string {
	return provider[0].toUpperCase() + provider.slice(1)
}

/**
 * Owns its own sign-in logic end to end — calls `authClient.signIn.email`/
 * `signIn.username` directly (merged into one `credentials` field, since
 * email and username sign-in are "the same thing, different terminology";
 * this picks which to call based on whether the value looks like an
 * email), rather than taking `schema`/`onSubmit` props from a consumer's
 * own server-fn layer. Matches the boundary `Topbar`'s sign-out button and
 * the real `users` collection already draw around better-auth — a
 * consumer's own `auth.ts`/`authClient.ts` stay entirely their own, this
 * component only ever calls the already-injected `authClient`
 * (`getAuthClient()`, populated once via `baseConfig({auth})`).
 *
 * Passkey sign-in and the 2FA challenge step are feature-detected —
 * `authClient.signIn.passkey`/`authClient.twoFactor` are only present when
 * the consumer's own `authClient.ts` actually registered those client
 * plugins (`passkeyClient()`/`twoFactorClient()`), a safe, real runtime
 * check with no server round-trip needed. Social sign-in isn't
 * feature-detectable the same way (see `socialProviders`' own doc
 * comment) — it defaults from `getAdminConfig()` (`baseConfig()`'s own
 * `config.socialProviders`, set once app-wide) rather than a per-call prop.
 */
export function LoginView({
	title = 'Sign in',
	icon = getAdminConfig()?.adminIcon,
	createAccountHref = '/admin/create-account',
	forgotPasswordHref = '/admin/forgot-password',
	termsHref = '/terms',
	privacyHref = '/privacy',
	socialProviders = getAdminConfig()?.socialProviders ?? []
}: LoginViewProps) {
	const authClient = getAuthClient()
	const navigate = useNavigate()
	const [twoFactorPending, setTwoFactorPending] = useState(false)

	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: loginSchema, onChange: loginSchema },
		onSubmit: async ({ value }) => {
			await signIn.mutateAsync(value)
		}
	})

	const otpForm = useAppForm({
		defaultValues: { code: '' },
		validators: { onSubmit: otpSchema, onChange: otpSchema },
		onSubmit: async ({ value }) => {
			await verifyTotp.mutateAsync(value.code)
		}
	})

	const signIn = useMutation({
		mutationFn: async (value: LoginFormValues) => {
			if (!authClient) {
				throw new Error(
					'LoginView was rendered but no `auth` was passed to baseConfig() — see BaseConfigProps["auth"].'
				)
			}
			const isEmail = value.credentials.includes('@')
			const result = isEmail
				? await authClient.signIn.email({
						email: value.credentials,
						password: value.password,
						rememberMe: value.rememberMe
					})
				: await authClient.signIn.username({
						username: value.credentials,
						password: value.password,
						rememberMe: value.rememberMe
					})
			return unwrap(result)
		},
		onSuccess: (data) => {
			if ((data as { twoFactorRedirect?: boolean }).twoFactorRedirect) {
				setTwoFactorPending(true)
				return
			}
			t.success('Success', {
				description: `Welcome ${(data as { user?: { name?: string } }).user?.name ?? ''}`
			})
			navigate({ to: '/admin', replace: true, reloadDocument: true })
		},
		onError: (error) => {
			t.error(error.name ?? 'Error', { description: error.message })
		}
	})

	const verifyTotp = useMutation({
		mutationFn: async (code: string) => {
			if (!authClient?.twoFactor) {
				throw new Error('Two-factor verification isn’t available.')
			}
			return unwrap(await authClient.twoFactor.verifyTotp({ code }))
		},
		onSuccess: () => {
			t.success('Success', { description: 'Signed in' })
			navigate({ to: '/admin', replace: true, reloadDocument: true })
		},
		onError: (error) => {
			t.error(error.name ?? 'Error', { description: error.message })
		}
	})

	const signInWithPasskey = useMutation({
		mutationFn: async () => {
			if (!authClient?.signIn.passkey) {
				throw new Error('Passkey sign-in isn’t available.')
			}
			return unwrap(await authClient.signIn.passkey())
		},
		onSuccess: () => {
			t.success('Success', { description: 'Signed in with passkey' })
			navigate({ to: '/admin', replace: true, reloadDocument: true })
		},
		onError: (error) => {
			t.error(error.name ?? 'Error', { description: error.message })
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
						twoFactorPending
							? 'Enter the 6-digit code from your authenticator app'
							: 'Please sign in to continue'
					}
				/>

				{twoFactorPending ? (
					<form
						onSubmit={(e) => {
							e.preventDefault()
							otpForm.handleSubmit()
						}}
						className='flex flex-col gap-5'
					>
						<otpForm.AppField name='code'>
							{(f: any) => (
								<f.Input
									required
									label='Verification code'
									placeholder='123456'
								/>
							)}
						</otpForm.AppField>
						<otpForm.AppForm>
							<otpForm.Scribe label='Verify' />
						</otpForm.AppForm>
					</form>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className='flex flex-col gap-5'
					>
						<form.AppField name='credentials'>
							{(f: any) => (
								<f.Input
									required
									label='Email or Username'
									type='text'
									placeholder='Email or Username'
								/>
							)}
						</form.AppField>

						<form.AppField name='password'>
							{(f: any) => (
								<f.Input
									required
									label='Password'
									type='password'
									placeholder='Password'
								/>
							)}
						</form.AppField>

						<form.AppField name='rememberMe'>
							{(f: any) => <f.Switch label='Remember me' />}
						</form.AppField>

						<form.AppForm>
							<form.Scribe label='Login' />
						</form.AppForm>

						{authClient?.signIn.passkey ? (
							<button
								type='button'
								onClick={() => signInWithPasskey.mutate()}
								disabled={signInWithPasskey.isPending}
								className='text-center text-sm underline'
							>
								{signInWithPasskey.isPending
									? 'Signing in…'
									: 'Sign in with a passkey'}
							</button>
						) : null}

						{socialProviders.length > 0 ? (
							<div className='flex flex-col gap-2'>
								{socialProviders.map((provider) => (
									<button
										key={provider}
										type='button'
										onClick={() => authClient?.signIn.social?.({ provider })}
										className='rounded-md border py-1.5 text-sm'
									>
										Continue with {providerLabel(provider)}
									</button>
								))}
							</div>
						) : null}

						<p className='text-center text-sm'>
							<a href={forgotPasswordHref}>Forgot your password?</a>
						</p>

						<p className='text-center text-sm'>
							Don't have an account?{' '}
							<a href={createAccountHref}>Create an account</a>, By continuing,
							you agree to our <a href={termsHref}>Terms of Service</a> and our{' '}
							<a href={privacyHref}>Privacy Policy</a>
						</p>
					</form>
				)}
			</section>
		</article>
	)
}
