import { DefaultLoader } from '@/components/bounderies/default-loader'
import {
	DocsPageContent,
	docsPageHead,
	loadDocsPage
} from '@/components/renderers'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(frontend)/(pages)/docs/$slug')({
	loader: ({ context, params }) => loadDocsPage(context, params.slug),
	head: ({ loaderData }) => docsPageHead(loaderData?.activeDoc),
	pendingComponent: DefaultLoader,
	component: RouteComponent
})

function RouteComponent() {
	const { slug } = Route.useParams()
	return <DocsPageContent slug={slug} />
}
