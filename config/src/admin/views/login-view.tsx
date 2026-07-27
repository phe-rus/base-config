import { AuthBanner } from './auth-banner'
import { cn } from '@pherus/ui/lib/utils'
import { useAppForm } from '@pherus/utilities/forms'
import type { z } from 'zod'

export type LoginFormValues = {
	credentials: string
	password: string
	rememberMe: boolean
}

type LoginViewProps = {
	title?: string
	/** e.g. a consumer's own `config.adminIcon` (`AdminSettings`) — omit for no icon. */
	icon?: string
	/** Loosely typed on purpose, same trade-off `useDocument`'s own `schema: z.ZodTypeAny` makes — this package can't know a consumer's exact auth schema shape ahead of time, only that `LoginFormValues` is what it produces/consumes. */
	schema: z.ZodTypeAny
	defaultValues: LoginFormValues
	onSubmit: (value: LoginFormValues) => Promise<unknown>
	createAccountHref?: string
	termsHref?: string
	privacyHref?: string
}

/**
 * A consumer's own better-auth *server* config (`auth.ts`) and its
 * `createServerFn()` mutation layer (`use-session.ts`-style) stay entirely
 * the consumer's own — this component only ever receives already-built
 * `schema`/`defaultValues`/`onSubmit`, the same boundary `Topbar`'s
 * sign-out button and the real `users` collection already draw around
 * better-auth. Mounted directly as a route's `component` (see
 * `www/src/routes/(auth)/auth/index.tsx`).
 */
export function LoginView({
	title = 'Sign in',
	icon,
	schema,
	defaultValues,
	onSubmit,
	createAccountHref = '/auth/create-account',
	termsHref = '/terms',
	privacyHref = '/privacy'
}: LoginViewProps) {
	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: schema as any,
			onChange: schema as any
		},
		onSubmit: async ({ value }) => {
			try {
				await onSubmit(value)
			} finally {
				form.reset()
			}
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
