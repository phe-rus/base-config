import { cn } from '../lib/utils'

// The editor's root contentEditable: this must stay normal block flow.
// `display: grid`/`flex` here (even with no explicit column template) turns
// every top-level node (every paragraph, heading, and block, including
// GridBlock/RowBlock/CardBlock) into a grid item with no column sizing
// defined, which triggers unpredictable auto-track shrinking that cascades
// into anything nested inside them too.
export const basiccnTheme = cn(
	'typeset typeset-base isolate max-w-none outline-none w-full wrap-anywhere',
	'grid grid-rows-[auto_1fr] gap-5'
)
