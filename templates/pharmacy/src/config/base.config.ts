import { baseConfig } from '@baseconfig/core'
import { getBaseURL } from '@/lib/getURL'
import { authClient } from '@/config/api/auth/authClient'
import { getContext } from '@/utils/query'
import { posts } from './collections/posts'
import { settings } from './globals/settings'
import { storage } from './globals/storage'
import { users } from './collections/users'
import { products } from './collections/products'

export default baseConfig({
	hostDomain: getBaseURL(),
	queryClient: getContext(),
	offlineFirst: true,
	auth: authClient,
	config: {
		adminPath: 'admin',
		adminIcon: '/icon.png'
	},
	collections: [users, products, posts],
	globals: [settings, storage]
})
