import type { ReactNode } from 'react'

type AuthBannerProps = {
	title: string
	icon?: string
	description: ReactNode
}

/**
 * The icon/title/description header shared by `LoginView`/`CreateAccountView`
 * — `icon` is a plain URL (e.g. a consumer's own `config.adminIcon`, see
 * `AdminSettings`), not hardcoded to any one site's favicon.
 */
export function AuthBanner({ title, icon, description }: AuthBannerProps) {
	return (
		<div className='flex flex-col items-center text-center'>
			{icon && (
				<img
					src={icon}
					alt={title}
					className='size-32 rounded-full overflow-hidden'
				/>
			)}
			<h1>{title}</h1>
			<p className='text-sm'>{description}</p>
		</div>
	)
}
