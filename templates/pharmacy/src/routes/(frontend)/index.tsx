import { Products } from '@/components/products'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<article className='flex flex-col gap-5 py-20 mx-auto'>
			<section className='container flex flex-col w-full md:max-w-2xl'>
				<p className='font-medium text-muted-foreground border rounded-md p-5'>
					Lorem ipsum is placeholder text commonly used in the graphic, print,
					and publishing industries for previewing layouts and visual mockups.
				</p>
			</section>

			<section className='container flex flex-col gap-5 w-full md:max-w-2xl'>
				<Products />
			</section>
		</article>
	)
}
