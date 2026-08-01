import { cancel, intro, isCancel, log, select, text } from '@clack/prompts'
import { existsSync } from 'node:fs'
import path from 'node:path'

export type Template = { id: string; label: string; hint?: string }

/** Every template this package ships (its own `templates/<id>/` folder, synced from this repo's own `templates/<id>` by `scripts/sync-template.ts`). Only one exists today: the select prompt below is skipped entirely while that stays true, per the CLI's own UX design. */
export const TEMPLATES: Template[] = [
	{
		id: 'basics',
		label: 'basics',
		hint: 'one posts collection, one settings global, email+password auth'
	}
]

export type CliFlags = {
	name?: string
	template?: string
	d1?: string
	r2?: string
	kv?: string
	install: boolean
	git: boolean
	yes: boolean
}

export type ScaffoldAnswers = {
	name: string
	targetDir: string
	template: string
	d1Name: string
	r2Name: string
	kvName: string
	install: boolean
	git: boolean
}

function onCancel(): never {
	cancel('Cancelled.')
	process.exit(1)
}

function nameError(name: string): string | undefined {
	if (!name) return 'A project name is required.'
	if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
		return 'Use only letters, numbers, dots, dashes, and underscores.'
	}
	if (existsSync(path.resolve(process.cwd(), name))) {
		return `"${name}" already exists in this directory.`
	}
	return undefined
}

async function resolveName(
	flags: CliFlags,
	positional: string | undefined
): Promise<string> {
	const provided = flags.name ?? positional
	if (provided) {
		const error = nameError(provided)
		if (error) throw new Error(error)
		return provided
	}
	if (flags.yes) {
		throw new Error(
			'A project name is required when using --yes (pass -n <name> or a positional argument).'
		)
	}

	const answer = await text({
		message: 'Project name',
		placeholder: 'my-app',
		validate: (value) => nameError(value ?? '')
	})
	if (isCancel(answer)) onCancel()
	return answer
}

async function resolveTemplate(flags: CliFlags): Promise<string> {
	if (flags.template) {
		if (!TEMPLATES.some((t) => t.id === flags.template)) {
			throw new Error(
				`Unknown template "${flags.template}". Available: ${TEMPLATES.map((t) => t.id).join(', ')}`
			)
		}
		return flags.template
	}

	// Only one template exists today: auto-select it and print a plain
	// confirmation line instead of showing a select prompt with a single,
	// forced choice. A real select only appears once a second template ships.
	if (TEMPLATES.length === 1) {
		log.step(`Using template: ${TEMPLATES[0].label}`)
		return TEMPLATES[0].id
	}
	if (flags.yes) return TEMPLATES[0].id

	const answer = await select({
		message: 'Template',
		options: TEMPLATES.map((t) => ({ value: t.id, label: t.label, hint: t.hint }))
	})
	if (isCancel(answer)) onCancel()
	return answer
}

async function resolveResourceName(
	message: string,
	provided: string | undefined,
	fallbackDefault: string,
	skipPrompt: boolean
): Promise<string> {
	if (provided) return provided
	if (skipPrompt) return fallbackDefault

	const answer = await text({ message, initialValue: fallbackDefault })
	if (isCancel(answer)) onCancel()
	return answer || fallbackDefault
}

export async function runPrompts(
	flags: CliFlags,
	positional: string | undefined
): Promise<ScaffoldAnswers> {
	intro('@baseconfig/cli')

	const name = await resolveName(flags, positional)
	const template = await resolveTemplate(flags)
	const d1Name = await resolveResourceName('D1 database name', flags.d1, name, flags.yes)
	const r2Name = await resolveResourceName(
		'R2 bucket name',
		flags.r2,
		`${name}-media`,
		flags.yes
	)
	const kvName = await resolveResourceName(
		'KV (cache) namespace name',
		flags.kv,
		`${name}-cache`,
		flags.yes
	)

	return {
		name,
		targetDir: path.resolve(process.cwd(), name),
		template,
		d1Name,
		r2Name,
		kvName,
		install: flags.install,
		git: flags.git
	}
}
