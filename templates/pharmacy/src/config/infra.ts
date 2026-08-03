// In-process content access for server functions/loaders in this same
// Worker: no HTTP round-trip to the `app` above, see `createLocalAPI`'s own
// doc comment (`@baseconfig/core/api`). e.g. `await baseApi.find({
// collection: 'products', publishedOnly: true })` from a TanStack Start loader.

import { createLocalAPI } from '@baseconfig/core/api'
import { contentdb } from '@db/db'

export const baseApi = createLocalAPI({ db: contentdb })
