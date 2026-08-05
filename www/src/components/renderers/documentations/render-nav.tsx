import { cn } from '@/lib/cn'
import { Link } from '@tanstack/react-router'
import type { DocumentNode } from './build-doc-tree'

export const RenderNav = (nodes: DocumentNode[], depth = 0) => (
	<div className={cn('flex flex-col', depth > 0 && 'pl-2')}>
		{nodes.map((item) => (
			<section key={item.id}>
				<Link
					to='/docs'
					search={{ slug: item.slug ?? undefined }}
					className={cn(
						'text-sm py-1 transition-colors block',
						depth > 0 && 'text-muted-foreground'
					)}
					activeProps={{ className: 'font-bold text-primary!' }}
				>
					{depth > 0 && '- '}
					{item.title}
				</Link>
				{item.children.length > 0 && RenderNav(item.children, depth + 1)}
			</section>
		))}
	</div>
)
