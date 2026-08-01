import { Dashboard } from '../dashboard/component'
import { Entry } from './entry'
import { Storage } from '../storage/component'

/**
 * Every route-mounted admin view (one a consumer wires directly as a
 * route's `component`), grouped under one namespace instead of separately-
 * named barrel exports: a consumer writes `component: ContextView.Entry`,
 * not `import {Entry} from ...`. `Entry` alone now covers what `List`/
 * `CollectionEdit` used to split across two route files (`$collection/index.tsx` +
 * `$collection/$uid.tsx`), see `provider.tsx`/`context.tsx` for how the
 * unified `$collection/$` splat route resolves list-vs-edit-vs-global-vs-custom
 * once, upstream of this dispatch.
 */
export const ContextView = {
	Dashboard,
	Entry,
	Storage
}
