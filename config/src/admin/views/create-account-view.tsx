import { AuthBanner } from './auth-banner'
import { cn } from '@pherus/ui/lib/utils'
import { useAppForm } from '@base/ui/forms'
import type { z } from 'zod'

export type CreateAccountFormValues = {
	name: string
	username: string
	email: string
	password: string
	repassword: string
}

type CreateAccountViewProps = {
	title?: string
	/** e.g. a consumer's own `config.adminIcon` (`AdminSettings`) — omit for no icon. */
	icon?: string
	/** Loosely typed on purpose — see `LoginView`'s own `schema` doc comment. */
	schema: z.ZodTypeAny
	defaultValues: CreateAccountFormValues
	onSubmit: (value: CreateAccountFormValues) => Promise<unknown>
	/** Async username-availability check — debounced by this component (300ms), same as the original page had. */
	onCheckUsername: (username: string) => Promise<boolean>
	loginHref?: string
	termsHref?: string
	privacyHref?: string
}

/**
 * The `CreateAccountFormValues`/`onSubmit`/`onCheckUsername` boundary keeps
 * this fully decoupled from better-auth specifics — see `LoginView`'s own
 * doc comment for the same reasoning. Mounted directly as a route's
 * `component` (see `www/src/routes/(auth)/auth/create-account.tsx`).
 */
export function CreateAccountView({
	title = 'Create account',
	icon,
	schema,
	defaultValues,
	onSubmit,
	onCheckUsername,
	loginHref = '/auth',
	termsHref = '/terms',
	privacyHref = '/privacy'
}: CreateAccountViewProps) {
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
					description='Create an account to access our protected resources'
				/>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className='flex flex-col gap-5'
				>
					<form.AppField name='name'>
						{(f: any) => (
							<f.Input
								required
								label='Prefered Name'
								placeholder='Pixal'
								description='This name will be displayed on your profile'
							/>
						)}
					</form.AppField>

					<form.AppField
						name='username'
						asyncDebounceMs={300}
						validators={{
							onChangeAsync: async ({ value }: { value: string }) => {
								if (value.length < 3) return undefined
								const isAvailable = await onCheckUsername(value)
								return isAvailable ? undefined : 'Username taken'
							}
						}}
					>
						{(f: any) => (
							<f.Input
								required
								label='Username'
								type='text'
								placeholder='Username'
								description='This name will be used for your profile url. E.g. @username'
							/>
						)}
					</form.AppField>

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

					<form.AppField name='repassword'>
						{(f: any) => (
							<f.Input
								required
								label='Re-enter Password'
								type='password'
								placeholder='Re-enter Password'
							/>
						)}
					</form.AppField>

					<form.AppForm>
						<form.Scribe label='Create account' />
					</form.AppForm>

					<p className='text-center text-sm'>
						Already have an account? <a href={loginHref}>Login here</a>, By
						continuing, you agree to our{' '}
						<a href={termsHref}>Terms of Service</a> and our{' '}
						<a href={privacyHref}>Privacy Policy</a>
					</p>
				</form>
			</section>
		</article>
	)
}
