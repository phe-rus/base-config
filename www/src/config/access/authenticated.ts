import type { Access } from '@baseconfig/core'

export const authenticated: Access = ({ req: { user } }) => Boolean(user)
