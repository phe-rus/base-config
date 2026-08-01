import type { GlobalConfig } from '@baseconfig/core/collections/types'
import { defineGlobal } from '@baseconfig/core'
import { ContextView } from '@baseconfig/core/admin'

export const storage: GlobalConfig = defineGlobal({
	slug: 'storage',
	component: ContextView.Storage
})
