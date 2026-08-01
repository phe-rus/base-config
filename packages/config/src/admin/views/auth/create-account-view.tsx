import { AuthBanner } from './auth-banner'
import { cn } from '@baseconfig/ui/lib/utils'
import { t } from '@baseconfig/ui/components/sonner'
import { useAppForm } from '@baseconfig/ui/forms'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getAuthClient, unwrap } from '../../../db/collections'
import { getAdminConfig } from '../../functions/config-registry'

export type CreateAccountFormValues = {
	name: string
	email: string
	password: string
	repassword: string
}

type CreateAccountViewProps = {
	title?: string
	/** Defaults to `getAdminConfig()?.adminIcon`, see `LoginView`'s own doc comment. */
	icon?: string
	loginHref?: string
	termsHref?: string
	privacyHref?: string
	/** Defaults to `getAdminConfig()?.socialProviders`, see `LoginView`'s own doc comment for why this isn't feature-detected. */
	socialProviders?: string[]
}

const createSchema = z.object({
	name: z.string().min(3, 'Name is required'),
	email: z.email(),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters long')
		.max(128, 'Password must be at most 128 characters long')
		.regex(/.*[A-Z]/, 'Password must contain at least one uppercase letter')
		.regex(/.*[a-z]/, 'Password must contain at least one lowercase letter')
		.regex(/.*[0-9]/, 'Password must contain at least one number')
		.regex(
			/.*[!@#$%^&*(),.?":{}|<>]/,
			'Password must contain at least one special character'
		),
	repassword: z.string()
})

const signSchema = createSchema.refine(
	(data) => data.password === data.repassword,
	{ message: 'Passwords do not match', path: ['repassword'] }
)

const defaultValues: CreateAccountFormValues = {
	email: '',
	password: '',
	repassword: '',
	name: ''
}

function providerLabel(provider: string): string {
	return provider[0].toUpperCase() + provider.slice(1)
}

/**
 * Owns its own sign-up logic end to end, calls `authClient.signUp.email`
 * directly (email+password only, no username), same boundary `LoginView`
 * already draws (see that component's own doc comment).
 */
export function CreateAccountView({
	title = 'Create account',
	icon = getAdminConfig()?.adminIcon,
	loginHref = '/admin/login',
	termsHref = '/terms',
	privacyHref = '/privacy',
	socialProviders = getAdminConfig()?.socialProviders ?? []
}: CreateAccountViewProps) {
	const authClient = getAuthClient()
	const navigate = useNavigate()

	const signUp = useMutation({
		mutationFn: async (value: CreateAccountFormValues) => {
			if (!authClient) {
				throw new Error(
					'CreateAccountView was rendered but no `auth` was passed to baseConfig(): see BaseConfigProps["auth"].'
				)
			}
			return unwrap(
				await authClient.signUp.email({
					email: value.email,
					password: value.password,
					name: value.name
				})
			)
		},
		onSuccess: () => {
			t.success('Success', { description: 'Account created successfully' })
			navigate({ to: '/admin/login', replace: true })
		},
		onError: (error) => {
			t.error(error.name ?? 'Error', { description: error.message })
		}
	})

	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: signSchema, onChange: signSchema },
		onSubmit: async ({ value }) => {
			try {
				await signUp.mutateAsync(value)
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
