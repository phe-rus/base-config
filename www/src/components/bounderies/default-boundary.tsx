import { cn } from '@/lib/cn'
import { Button, buttonVariants } from '@baseconfig/ui/components/button'
import type { ErrorComponentProps } from '@tanstack/react-router'
import {
	ErrorComponent,
	Link,
	useLocation,
	useRouter
} from '@tanstack/react-router'

export function DefaultBoundary({ error }: ErrorComponentProps) {
	const router = useRouter()
	const isRoot = useLocation({
		select: (location) => location.pathname === '/'
	})

	return (
		<div className='flex min-h-100 w-full flex-col items-center justify-center gap-6 p-6 text-center'>
			<div className='w-full max-w-md overflow-hidden rounded-md border border-destructive/20 bg-destructive/5 p-4 text-left'>
				<p className='mb-2 text-xs font-semibold uppercase tracking-wider text-destructive'>
					Application Error
				</p>
				<ErrorComponent error={error} />
			</div>

			<div className='flex flex-wrap items-center gap-2 justify-center'>
				<Button
					onClick={() => router.invalidate()}
					variant='secondary'
					size='sm'
				>
					Try Again
				</Button>

				{isRoot ? (
					<Link
						to='/$'
						params={{ _splat: '' }}
						className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
					>
						Go Home
					</Link>
				) : (
					<Button
						onClick={() => router.history.back()}
						variant='default'
						size='sm'
					>
						Go Back
					</Button>
				)}
			</div>
		</div>
	)
}
