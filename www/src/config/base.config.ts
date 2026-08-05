import { baseConfig } from '@baseconfig/core'
import { getBaseURL } from '@/lib/getURL'
import { authClient } from '@/config/api/auth/authClient'
import { getContext } from '@/utils/query'
import { blocks } from './blocks'
import { docs } from './collections/docs'
import { storage } from './globals/storage'
import { users } from './collections/users'
import { keywords } from './globals/keywords'
import { pages } from './collections/pages'
import { topbar } from './globals/topbar'
import { category } from './globals/catagory'

export default baseConfig({
	hostDomain: getBaseURL(),
	queryClient: getContext(),
	offlineFirst: true,
	auth: authClient,
	config: {
		adminPath: 'admin',
		adminIcon: '/icon.png'
	},
	blocks: [...blocks],
	collections: [users, pages, docs],
	globals: [topbar, keywords, category, storage]
})
