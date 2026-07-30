import { useAppForm } from '@baseconfig/ui/forms'
import { cn } from '@baseconfig/ui/lib/utils'
import { t } from '@baseconfig/ui/components/sonner'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getAuthClient, unwrap } from '../../../db/collections'
import { getAdminConfig } from '../../functions/config-registry'
import { AuthBanner } from './auth-banner'

export type LoginFormValues = {
	email: string
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
	email: z.email(),
	password: z.string().min(1, 'Required'),
	rememberMe: z.boolean()
})

const defaultValues: LoginFormValues = {
	email: '',
	password: '',
	rememberMe: true
}

function providerLabel(provider: string): string {
	return provider[0].toUpperCase() + provider.slice(1)
}

/**
 * Owns its own sign-in logic end to end, calls `authClient.signIn.email`
 * directly (email+password only, deliberately, no username sign-in, no
 * passkey, no two-factor challenge step), rather than taking
 * `schema`/`onSubmit` props from a consumer's own server-fn layer. Matches
 * the boundary `Topbar`'s sign-out button and the real `users` collection
 * already draw around better-auth: a consumer's own `auth.ts`/`authClient.ts`
 * stay entirely their own, this component only ever calls the
 * already-injected `authClient` (`getAuthClient()`, populated once via
 * `baseConfig({auth})`).
 *
 * Social sign-in isn't feature-detectable the way passkey/2FA used to be
 * (see `socialProviders`' own doc comment), it defaults from
 * `getAdminConfig()` (`baseConfig()`'s own `config.socialProviders`, set
 * once app-wide) rather than a per-call prop.
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

	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: loginSchema, onChange: loginSchema },
		onSubmit: async ({ value }) => {
			await signIn.mutateAsync(value)
		}
	})

	const signIn = useMutation({
		mutationFn: async (value: LoginFormValues) => {
			if (!authClient) {
				throw new Error(
					'LoginView was rendered but no `auth` was passed to baseConfig() — see BaseConfigProps["auth"].'
				)
			}
			const result = await authClient.signIn.email({
				email: value.email,
				password: value.password,
				rememberMe: value.rememberMe
			})
			return unwrap(result)
		},
		onSuccess: (data) => {
			t.success('Success', {
				description: `Welcome ${(data as { user?: { name?: string } }).user?.name ?? ''}`
			})
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
					description='Please sign in to continue'
				/>

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
								placeholder='Email'
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
			</section>
		</article>
	)
}
