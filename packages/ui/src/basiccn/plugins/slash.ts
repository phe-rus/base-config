import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import { Slashmenus, type SlashMenuListRef } from '../components/slash-menus'
import { filterCommands, type CommandItem } from '../utils/commands'

export const SlashCommandPluginKey = new PluginKey('slashCommand')

export interface SlashCommandOptions {
	suggestion: Partial<SuggestionOptions<CommandItem, CommandItem>>
}

/**
 * `/` trigger over `utils/commands.ts`. Self-contained: the extension owns
 * its own `items`/`render` wiring (unlike most tiptap examples that leave
 * that to the consumer) so `utils/extensions.ts` just adds `SlashCommand`
 * with no further setup, and `editor.tsx` never renders `<Slashmenus>`
 * declaratively — `ReactRenderer` + `props.mount()` mount/position/tear it
 * down entirely outside the normal React tree, which is the standard
 * tiptap+React pattern for suggestion-driven popups (same one `Mention`
 * itself uses).
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
	name: 'slashCommand',

	addOptions() {
		return {
			suggestion: {
				char: '/',
				pluginKey: SlashCommandPluginKey,
				allow: ({ editor }) => editor.isEditable,
				items: ({ query }) => filterCommands(query),
				command: ({ editor, range, props }) => {
					editor.chain().focus().deleteRange(range).run()
					props.run(editor)
				},
				render: () => {
					let component: ReactRenderer<SlashMenuListRef> | null = null
					let unmount: (() => void) | null = null

					return {
						onStart: (props) => {
							component = new ReactRenderer(Slashmenus, {
								editor: props.editor,
								props: {
									items: props.items,
									command: (item: CommandItem) => props.command(item)
								}
							})
							unmount = props.mount(component.element)
						},
						onUpdate: (props) => {
							component?.updateProps({
								items: props.items,
								command: (item: CommandItem) => props.command(item)
							})
						},
						onKeyDown: (props) => {
							if (props.event.key === 'Escape') {
								unmount?.()
								component?.destroy()
								return true
							}
							return component?.ref?.onKeyDown({ event: props.event }) ?? false
						},
						onExit: () => {
							unmount?.()
							component?.destroy()
							component = null
							unmount = null
						}
					}
				}
			}
		}
	},

	addProseMirrorPlugins() {
		return [
			Suggestion<CommandItem, CommandItem>({
				editor: this.editor,
				...this.options.suggestion
			})
		]
	}
})
