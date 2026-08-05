import { cn } from '@/lib/cn'
import { Link } from '@tanstack/react-router'
import type { DocumentNode } from './build-doc-tree'

interface RenderNavProps {
	nodes: DocumentNode[]
	depth?: number
}

export function RenderNav({ nodes, depth = 0 }: RenderNavProps) {
	return (
		<div className='flex flex-col gap-0.5!'>
			{nodes.map((item) => {
				if (item.isCategory) {
					return (
						<div key={item.id} className='mt-5 first:mt-0'>
							<h4 className='text-sm capitalize'>{item.title}</h4>
							{item.children.length > 0 && (
								<div className='flex flex-col'>
									<RenderNav nodes={item.children} depth={1} />
								</div>
							)}
						</div>
					)
				}
				return (
					<div key={item.id}>
						<Link
							to='/docs'
							search={{ slug: item.slug ?? undefined }}
							className={cn(
								'block pl-1 text-sm transition-colors',
								depth > 0 ? 'text-muted-foreground' : 'text-foreground'
							)}
							activeProps={{
								className: 'font-medium text-primary!'
							}}
						>
							{depth > 0 ? '- ' : null}
							{item.title}
						</Link>
						{item.children.length > 0 && (
							<div className='ml-3 pl-2'>
								<RenderNav nodes={item.children} depth={depth + 1} />
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
