#!/usr/bin/env node
import { log, outro } from '@clack/prompts'
import path from 'node:path'
import { type CliFlags, runPrompts } from './prompts'
import { scaffold } from './scaffold'

function printHelp(): void {
	console.log(`
bunx @baseconfig/cli [name] [options]

  -n, --name <name>       Project name / directory to create
  -t, --template <name>   Template to use (default: basics)
      --d1 <name>         D1 database name (default: <name>)
      --r2 <name>         R2 bucket name (default: <name>-media)
      --kv <name>         KV (cache) namespace name (default: <name>-cache)
      --no-install        Skip \`bun install\`
      --no-git            Skip \`git init\`
  -y, --yes               Accept all defaults, skip every prompt
  -h, --help              Show this help
`)
}

function parseArgs(argv: string[]): {
	positional: string | undefined
	flags: CliFlags
} {
	let positional: string | undefined
	const flags: CliFlags = { install: true, git: true, yes: false }

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === '-h' || arg === '--help') {
			printHelp()
			process.exit(0)
		}
		if (arg === '-y' || arg === '--yes') {
			flags.yes = true
			continue
		}
		if (arg === '--no-install') {
			flags.install = false
			continue
		}
		if (arg === '--no-git') {
			flags.git = false
			continue
		}
		if (arg === '-n' || arg === '--name') {
			flags.name = argv[++i]
			continue
		}
		if (arg === '-t' || arg === '--template') {
			flags.template = argv[++i]
			continue
		}
		if (arg === '--d1') {
			flags.d1 = argv[++i]
			continue
		}
		if (arg === '--r2') {
			flags.r2 = argv[++i]
			continue
		}
		if (arg === '--kv') {
			flags.kv = argv[++i]
			continue
		}
		if (arg.startsWith('--name=')) {
			flags.name = arg.slice('--name='.length)
			continue
		}
		if (arg.startsWith('--template=')) {
			flags.template = arg.slice('--template='.length)
			continue
		}
		if (arg.startsWith('--d1=')) {
			flags.d1 = arg.slice('--d1='.length)
			continue
		}
		if (arg.startsWith('--r2=')) {
			flags.r2 = arg.slice('--r2='.length)
			continue
		}
		if (arg.startsWith('--kv=')) {
			flags.kv = arg.slice('--kv='.length)
			continue
		}
		if (!arg.startsWith('-') && !positional) {
			positional = arg
			continue
		}
	}

	return { positional, flags }
}

async function main(): Promise<void> {
	const { positional, flags } = parseArgs(process.argv.slice(2))

	let answers: Awaited<ReturnType<typeof runPrompts>>
	try {
		answers = await runPrompts(flags, positional)
	} catch (err) {
		console.error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	}

	try {
		await scaffold(answers)
	} catch (err) {
		log.error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	}

	const relativeDir = path.relative(process.cwd(), answers.targetDir) || '.'
	outro(
		[
			'Done! Next steps:',
			'',
			`  cd ${relativeDir}`,
			'  cp .env.example .env.local   # then fill in a real BETTER_AUTH_SECRET',
			'  bun run local                # generate schemas + migrate a local D1',
			'  bun run dev                  # http://localhost:3000',
			'',
			'Before deploying for real, run:',
			`  wrangler d1 create ${answers.d1Name}`,
			`  wrangler r2 bucket create ${answers.r2Name}`,
			`  wrangler kv namespace create ${answers.kvName}`
		].join('\n')
	)
}

main()
