import { cn } from '@/lib/cn'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '@baseconfig/ui/components/collapsible'
import { IconChevronRight, IconPointFilled } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { docTreeContainsSlug, type DocumentNode } from './build-doc-tree'

interface RenderNavProps {
	nodes: DocumentNode[]
	depth?: number
	/** The doc currently being read, used only to decide which category starts expanded, see `docTreeContainsSlug`'s own doc comment. */
	activeSlug?: string
}

export function RenderNav({ nodes, depth = 0, activeSlug }: RenderNavProps) {
	return (
		<div className={cn('flex flex-col', 'gap-0.5!')}>
			{nodes.map((item) => {
				if (item.isCategory) {
					return (
						<Collapsible
							key={item.id}
							defaultOpen={docTreeContainsSlug(item.children, activeSlug)}
							className={cn('mt-2', 'first:mt-0')}
						>
							<CollapsibleTrigger
								className={cn(
									'group flex w-full items-center justify-between',
									'gap-1'
								)}
							>
								<span className='truncate text-sm!'>{item.title}</span>
								<IconChevronRight
									className={cn(
										'size-3.5 shrink-0 text-muted-foreground',
										'transition-transform group-data-panel-open:rotate-90'
									)}
								/>
							</CollapsibleTrigger>
							{item.children.length > 0 && (
								<CollapsibleContent
									className={cn('flex flex-col text-sm!', 'ml-0.5')}
								>
									<RenderNav
										nodes={item.children}
										depth={1}
										activeSlug={activeSlug}
									/>
								</CollapsibleContent>
							)}
						</Collapsible>
					)
				}
				return (
					<div key={item.id}>
						<Link
							to='/docs/$slug'
							params={{ slug: item.slug ?? '' }}
							className={cn(
								'flex items-center gap-1 truncate pl-1 transition-colors',
								depth > 0 ? 'text-muted-foreground' : 'text-foreground'
							)}
							activeProps={{
								className: 'font-medium text-primary!'
							}}
						>
							{depth > 0 ? <IconPointFilled className='size-2' /> : ' '}
							{item.title}
						</Link>
						{item.children.length > 0 && (
							<div className={cn('ml-3', 'pl-2')}>
								<RenderNav
									nodes={item.children}
									depth={depth + 1}
									activeSlug={activeSlug}
								/>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
