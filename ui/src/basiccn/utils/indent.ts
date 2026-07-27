import { Extension, type CommandProps } from '@tiptap/core'

export interface IndentOptions {
	types: string[]
	minIndent: number
	maxIndent: number
	/** em per indent level. */
	indentSize: number
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		indent: {
			indent: () => ReturnType
			outdent: () => ReturnType
		}
	}
}

/**
 * Paragraph/heading indent as a node attribute (`margin-left`), not list
 * nesting — `ListKit`'s `ListKeymap` already owns Tab/Shift-Tab for sinking
 * and lifting list items, so this is deliberately button-only (no keyboard
 * shortcut) to avoid fighting that binding.
 */
export const Indent = Extension.create<IndentOptions>({
	name: 'indent',

	addOptions() {
		return {
			types: ['paragraph', 'heading'],
			minIndent: 0,
			maxIndent: 8,
			indentSize: 1.5
		}
	},

	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					indent: {
						default: 0,
						parseHTML: (element) => {
							const margin = Number.parseFloat(element.style.marginLeft || '0')
							return margin ? Math.round(margin / this.options.indentSize) : 0
						},
						renderHTML: (attributes) => {
							if (!attributes.indent) return {}
							return {
								style: `margin-left: ${attributes.indent * this.options.indentSize}em`
							}
						}
					}
				}
			}
		]
	},

	addCommands() {
		const step = (delta: number) => {
			return () =>
				({ tr, state, dispatch }: CommandProps) => {
					const { from, to } = state.selection
					if (dispatch) {
						state.doc.nodesBetween(from, to, (node, pos) => {
							if (!this.options.types.includes(node.type.name)) return
							const next = Math.min(
								this.options.maxIndent,
								Math.max(
									this.options.minIndent,
									(node.attrs.indent ?? 0) + delta
								)
							)
							tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next })
						})
						dispatch(tr)
					}
					return true
				}
		}

		return {
			indent: step(1),
			outdent: step(-1)
		}
	}
})
