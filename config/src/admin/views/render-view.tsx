import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@pherus/ui/components/breadcrumb'
import { Button } from '@pherus/ui/components/button'
import { cn } from '@pherus/ui/lib/utils'
import { IconFolderFilled, IconMinus, IconPlus } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { Fragment, type PropsWithChildren, type ReactNode } from 'react'

type RenderViewProps = PropsWithChildren<{ className?: string }>

type RenderViewHeaderProps = PropsWithChildren<{ title: string }>

type RenderViewNotFoundProps = PropsWithChildren

type RenderViewListItem = {
	key: string
	label: string
	href: string
	colors?: string
}

type RenderViewListProps = {
	title: string
	items: RenderViewListItem[]
}

type RenderViewBreadcrumbSegment = { name: string; path: string }

type RenderViewBreadcrumbProps = {
	/** Label for the root segment (before any path segments) — e.g. "Storage". */
	rootLabel: string
	path: string
	/** Pre-computed by the caller (e.g. `pathSegmentsOf`, `fields/storage-client.ts`) — kept out of this file so `RenderView` stays free of any one domain's utilities. */
	segments: RenderViewBreadcrumbSegment[]
	onNavigate: (path: string) => void
}

type RenderViewFolderCardProps = {
	name: string
	onOpen: () => void
	onDelete: () => void
	deleting: boolean
}

type RenderViewFileCardProps = {
	name: string
	url: string
	isImage: boolean
	meta: ReactNode
	onDelete: () => void
	deleting: boolean
}

type RenderViewComponent = ((props: RenderViewProps) => ReactNode) & {
	Header: (props: RenderViewHeaderProps) => ReactNode
	List: (props: RenderViewListProps) => ReactNode
	NotFound: (props: RenderViewNotFoundProps) => ReactNode
	Breadcrumb: (props: RenderViewBreadcrumbProps) => ReactNode
	FolderCard: (props: RenderViewFolderCardProps) => ReactNode
	FileCard: (props: RenderViewFileCardProps) => ReactNode
}

/**
 * The reusable chrome behind every top-level admin view — a compound
 * component (`RenderView` itself is the outer page container; `.Header`,
 * `.List`, `.NotFound`, `.Breadcrumb`, `.FolderCard`, `.FileCard` are named
 * sub-pieces), all pulled out after `Dashboard`/`Storage`/`CollectionTable`/
 * `List`/`CollectionEdit`/`CollectionForm` turned out to share this same
 * markup byte-for-byte (modulo class order and the data behind it).
 */
export const RenderView: RenderViewComponent = ({
	className,
	children
}: RenderViewProps) => {
	return (
		<article
			className={cn(
				'container flex flex-col w-full md:max-w-4xl mx-auto gap-5 py-5',
				className
			)}
		>
			{children}
		</article>
	)
}

/** A plain title + arbitrary content block — e.g. `Dashboard`'s own welcome heading. */
RenderView.Header = ({ title, children }: RenderViewHeaderProps) => {
	return (
		<section>
			<h1>{title}</h1>
			{children}
		</section>
	)
}

/** A single muted message in the tighter `gap-2` container — the "unknown slug"/"nothing found" fallback every dispatched view falls back to. */
RenderView.NotFound = ({ children }: RenderViewNotFoundProps) => {
	return (
		<RenderView className='gap-2'>
			<p className='text-muted-foreground'>{children}</p>
		</RenderView>
	)
}

/** A titled grid of link cards — `Dashboard`'s "Collections"/"Preferences" sections, generalized since both were the exact same markup mapped over different data. */
RenderView.List = ({ title, items }: RenderViewListProps) => {
	return (
		<section className='flex flex-col gap-2'>
			<h2 className='text-muted-foreground'>{title}</h2>
			<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2'>
				{items.map((item) => (
					<Link
						key={item.key}
						to={item.href as any}
						className={cn(
							'flex items-center bg-card/55 rounded-md hover:bg-card/65',
							'relative p-3 col-span-1 border border-border/55',
							item.colors && `${item.colors} border-dashed`
						)}
					>
						<span className='text-xs'>{item.label}</span>
						<Button
							size='icon-xs'
							variant='secondary'
							className='rounded-full ml-auto'
						>
							<IconPlus />
						</Button>
					</Link>
				))}
			</div>
		</section>
	)
}

/** A path breadcrumb — root segment plus one clickable crumb per path segment, current segment shown as plain text. Currently only `Storage` uses this, but the shape (a navigable path, not anything storage-specific) is reusable by any future path-browsing view. */
RenderView.Breadcrumb = ({
	rootLabel,
	path,
	segments,
	onNavigate
}: RenderViewBreadcrumbProps) => {
	return (
		<Breadcrumb className='px-0!'>
			<BreadcrumbList className='px-0!'>
				<BreadcrumbItem>
					{path ? (
						<BreadcrumbLink
							onClick={() => onNavigate('')}
							className='cursor-pointer'
						>
							{rootLabel}
						</BreadcrumbLink>
					) : (
						<BreadcrumbPage className='cursor-pointer'>
							{rootLabel}
						</BreadcrumbPage>
					)}
				</BreadcrumbItem>
				{segments.map((segment, index) => (
					<Fragment key={segment.path}>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							{index === segments.length - 1 ? (
								<BreadcrumbPage>{segment.name}</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									onClick={() => onNavigate(segment.path)}
									className='cursor-pointer'
								>
									{segment.name}
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	)
}

/** A folder row in Storage's grid — name (opens it) + a hover-revealed delete button. */
RenderView.FolderCard = ({
	name,
	onOpen,
	onDelete,
	deleting
}: RenderViewFolderCardProps) => {
	return (
		<div
			className={cn('group flex items-center gap-2 rounded-md bg-popover p-3')}
		>
			<button
				type='button'
				onClick={onOpen}
				className='flex min-w-0 flex-1 items-center gap-2 text-left text-sm'
			>
				<IconFolderFilled className='size-4 shrink-0' />
				<span className='truncate'>{name}</span>
			</button>
			<Button
				type='button'
				title='Delete folder'
				size='icon-xs'
				variant='destructive'
				className='shrink-0 rounded-full opacity-0 group-hover:opacity-100'
				disabled={deleting}
				onClick={onDelete}
			>
				<IconMinus />
			</Button>
		</div>
	)
}

/** A file row in Storage's grid — image preview (or a placeholder) linking out to the file, name/size, and a hover-revealed delete button. */
RenderView.FileCard = ({
	name,
	url,
	isImage,
	meta,
	onDelete,
	deleting
}: RenderViewFileCardProps) => {
	return (
		<div
			className={cn(
				'group relative flex flex-col gap-1 rounded',
				'overflow-hidden border border-border/85',
				'border-dashed shadow-sm hover:shadow-2xl'
			)}
		>
			<Button
				type='button'
				title='Delete'
				size='icon-xs'
				variant='destructive'
				className={cn(
					'absolute top-1 right-1 rounded-full',
					'opacity-0 group-hover:opacity-100'
				)}
				disabled={deleting}
				onClick={onDelete}
			>
				<IconMinus />
			</Button>
			<a href={url} target='_blank' rel='noreferrer'>
				{isImage ? (
					<img
						src={url}
						alt={name}
						className='aspect-auto w-full rounded object-cover'
					/>
				) : (
					<div
						className={cn(
							'aspect-square w-full rounded bg-muted flex items-center',
							'justify-center text-xs text-muted-foreground'
						)}
					>
						{name}
					</div>
				)}
				<div className='flex flex-col px-2 py-1'>
					<span className='text-xs truncate'>{name}</span>
					<span className='text-xs text-muted-foreground'>{meta}</span>
				</div>
			</a>
		</div>
	)
}
