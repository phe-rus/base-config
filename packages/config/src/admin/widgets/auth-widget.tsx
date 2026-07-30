import { createRealUser } from '../../db/collections'
import type { ContentCollection } from '../../db/collections'
import { WidgetDialog } from './widget-dialog'
import { Button, buttonVariants } from '@baseconfig/ui/components/button'
import { DrawerTrigger } from '@baseconfig/ui/components/drawer'
import { Input } from '@baseconfig/ui/components/input'
import { Label } from '@baseconfig/ui/components/label'
import { cn } from '@baseconfig/ui/lib/utils'
import { useState } from 'react'

type AuthWidgetProps = {
	collection: ContentCollection
	onCreated: (id: string) => void
}

/**
 * The built-in create flow for `auth: true` collections — a real account
 * can't start blank the way every other collection's "Create new" does
 * (better-auth's `createUser` needs email+password upfront). Calls
 * `createRealUser()` directly rather than `collection.insert()` — see that
 * function's own doc comment for why (a client-generated id would never
 * match the id better-auth assigns the account server-side).
 */
export function AuthWidget({ collection, onCreated }: AuthWidgetProps) {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [creating, setCreating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const canCreate =
		!creating &&
		name.trim().length > 0 &&
		email.trim().length > 0 &&
		password.length >= 8

	const create = async () => {
		setCreating(true)
		setError(null)
		try {
			const id = await createRealUser(collection, {
				email,
				password,
				name,
				role: 'user'
			})
			setOpen(false)
			setName('')
			setEmail('')
			setPassword('')
			onCreated(id)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create user')
		} finally {
			setCreating(false)
		}
	}

	return (
		<WidgetDialog
			open={open}
			onOpenChange={setOpen}
			title='New user'
			description='Creates a real account immediately — the password is set now, not a placeholder to fill in later.'
			trigger={
				<DrawerTrigger
					className={cn(buttonVariants({ size: 'xs', variant: 'secondary' }))}
				>
					Create new
				</DrawerTrigger>
			}
			footer={
				<Button disabled={!canCreate} onClick={create}>
					{creating ? 'Creating…' : 'Create'}
				</Button>
			}
		>
			<div className='flex flex-col gap-1'>
				<Label htmlFor='new-user-name'>Name</Label>
				<Input
					id='new-user-name'
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</div>
			<div className='flex flex-col gap-1'>
				<Label htmlFor='new-user-email'>Email</Label>
				<Input
					id='new-user-email'
					type='email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
			</div>
			<div className='flex flex-col gap-1'>
				<Label htmlFor='new-user-password'>Password</Label>
				<Input
					id='new-user-password'
					type='password'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</div>
			{error && <p className='text-destructive text-xs'>{error}</p>}
		</WidgetDialog>
	)
}
