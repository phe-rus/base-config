// The Hono-scaffolding barrel: a consumer wires up its own API entry
// against these exports instead of reaching into individual files under
// `api/*`.

export { createIgnite } from './ignite'
export type { IgniteOptions } from './ignite'
export { Handler } from './handler'
export { createHandler } from './create-handler'
export type { AuthServerLike, CreateHandlerOptions } from './create-handler'
