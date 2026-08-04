import { cn } from '@/lib/cn'
import { IconLoader2 } from '@tabler/icons-react'

export function DefaultLoader() {
	return (
		<section
			className={cn(
				'flex h-screen w-screen items-center justify-center',
				'bg-background'
			)}
		>
			<IconLoader2 className='animate-spin duration-500 size-5!' />
		</section>
	)
}
