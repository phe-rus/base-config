import { baseConfig } from '@baseconfig/core'
import { getBaseURL } from '@/lib/getURL'
import { authClient } from '@/config/api/auth/authClient'
import { getContext } from '@/utils/query'
import { posts } from './collections/posts'
import { storage } from './globals/storage'
import { users } from './collections/users'
import { keywords } from './globals/keywords'

export default baseConfig({
	hostDomain: getBaseURL(),
	queryClient: getContext(),
	offlineFirst: true,
	auth: authClient,
	config: {
		adminPath: 'admin',
		adminIcon: '/icon.png'
	},
	collections: [users, posts],
	globals: [keywords, storage]
})
