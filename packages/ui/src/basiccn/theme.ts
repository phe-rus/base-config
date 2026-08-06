import { cn } from '../lib/utils'

// The editor's root contentEditable: this must stay normal block flow.
// `display: grid`/`flex` here (even with no explicit column template) turns
// every top-level node (every paragraph, heading, and block, including
// GridBlock/RowBlock/CardBlock) into a grid item with no column sizing
// defined, which triggers unpredictable auto-track shrinking that cascades
// into anything nested inside them too.
export const basiccnTheme = cn(
	'typeset typeset-base isolate max-w-none outline-none w-full wrap-anywhere',
	'grid grid-rows-[auto_1fr] gap-5',
	// Tables
	'[&>.tableWrapper]:overflow-x-auto [&>.tableWrapper]:no-scrollbar [&>.tableWrapper]:m-1',
	'typeset-table:overflow-hidden typeset-table:w-full typeset-table:table-fixed',
	'typeset-table:*:m-0 [&.resize-cursor]:cursor-ew-resize typeset-table:min-w-full',
	'[&>.resize-cursor]:cursor-col-resize [&>.column-resize-handle]:top-0',
	'[&>.column-resize-handle]:-right-0.5 [&>.column-resize-handle]:pointer-events-none',
	'[&>.column-resize-handle]:absolute [&>.column-resize-handle]:-bottom-0.5',
	'[&>.column-resize-handle]:bg-primary typeset-td:typeset-th:p-1.5',
	'typeset-td:typeset-th:border-primary typeset-td:typeset-th:min-w-[1em]',
	'typeset-td:typeset-th:relative typeset-td:typeset-th:align-top',
	'typeset-td:typeset-th:box-border typeset-td:typeset-th:border',
	'typeset-table:border-collapse! typeset-td:typeset-th:*:mb-0! typeset-table:*:w-full',
	'typeset-th:bg-card typeset-th:font-semibold typeset-th:text-left',
	'typeset-th:text-sm',
	// selected cell
	'[&>.selectedCell]:after:bg-secondary [&>.selectedCell]:after:content-[""]',
	'[&>.selectedCell]:after:px-0 [&>.selectedCell]:after:py-0',
	'[&>.selectedCell]:after:pointer-events-none [&>.selectedCell]:after:absolute',
	'[&>.selectedCell]:after:z-2'
)
