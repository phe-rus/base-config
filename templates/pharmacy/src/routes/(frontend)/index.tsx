import { Products } from '@/components/products'
import { cn } from '@/lib/cn'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/')({
	loader: ({ context }) => {
		return {
			lists: context.lists
		}
	},
	component: RouteComponent
})

function RouteComponent() {
	const { lists } = Route.useLoaderData()

	return (
		<article className='flex flex-col gap-5 py-10 mx-auto'>
			<section className='container flex flex-col w-full md:max-w-3xl'>
				<p
					className={cn(
						'font-mono text-sm border rounded-none p-12',
						'bg-amber-500/5 text-primary!',
						'border-black text-center'
					)}
				>
					Nullam ornare at augue vel placerat. Duis id turpis non magna
					pellentesque sodales nec nec lectus. Nullam at velit vel lacus mollis
					rhoncus id eget neque. Nullam pulvinar pharetra lacus, eget semper ex
					molestie a.
					<br />
					<br />
					Vestibulum in commodo risus. Duis pretium viverra mauris, ac gravida
					nisi iaculis nec. Ut nec nulla facilisis, posuere metus vitae,
					facilisis felis.
				</p>
			</section>

			<section className='container flex flex-col gap-5 w-full md:max-w-3xl'>
				<Products initialData={lists.docs} />
			</section>
		</article>
	)
}
