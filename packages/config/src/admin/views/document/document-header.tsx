import { cn } from '@baseconfig/ui/lib/utils'
import { format } from 'date-fns'
import type { ReactNode } from 'react'

type DocumentHeaderProps = {
	/** Whatever the caller wants in the title slot — `CollectionForm` renders either a read-only `useAsTitle` heading or an editable title field with slug-sync; `GlobalForm` renders a static heading. Kept as a slot rather than a fixed shape since that logic is genuinely different per caller, not incidental duplication. */
	title: ReactNode
	status: string
	createdAt: string | Date
	updatedAt: string | Date
	/** Save/publish/unpublish buttons — a global only ever gets a bare "Save" (no draft/published concept, see `content-schema.ts`'s `globals` table). */
	actions?: ReactNode
}

/**
 * The sticky document header — title area, Status/Created/Updated row,
 * optional actions — shared between `CollectionForm` and `GlobalForm`. Both
 * had this markup duplicated byte-for-byte before extraction; only the
 * title and actions actually differ per caller, so those are the only slots.
 */
export function DocumentHeader({
	title,
	status,
	createdAt,
	updatedAt,
	actions
}: DocumentHeaderProps) {
	return (
		<section
			className={cn(
				'sticky top-9 flex flex-col gap-3 w-full',
				'z-5 py-3 border-b bg-background'
			)}
		>
			<div className='container flex flex-col gap-2 w-full md:max-w-4xl mx-auto'>
				{title}
				<div
					className={cn(
						'flex flex-wrap items-center gap-2',
						'truncate md:justify-between'
					)}
				>
					<div
						className={cn(
							'flex flex-wrap items-center gap-2',
							'text-[10px] md:text-xs'
						)}
					>
						<div className='flex items-center gap-1'>
							<span className='font-bold'>Status: </span>
							<span className='text-muted-foreground'>{status}</span>
						</div>
						<div className='flex items-center gap-1'>
							<span className='font-bold'>Created: </span>
							<span className='text-muted-foreground'>
								{format(String(createdAt), 'PPP')}
							</span>
						</div>
						<div className='flex items-center gap-1'>
							<span className='font-bold'>Updated: </span>
							<span className='text-muted-foreground'>
								{format(String(updatedAt), 'PPP')}
							</span>
						</div>
					</div>
					{actions && <div className='flex items-center gap-2'>{actions}</div>}
				</div>
			</div>
		</section>
	)
}
