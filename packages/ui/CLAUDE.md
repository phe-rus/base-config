# CLAUDE.md: `packages/ui`

Guidance for `packages/ui/src/`: the sibling library to `@baseconfig/core`. See `packages/config/CLAUDE.md` (and its own subdirectory-scoped files) for this repo's other conventions, and `templates/basics/` for a real consumer wiring example.

Two subdirectories have their own scoped `CLAUDE.md`, loaded automatically when a session works there:

- **`src/forms/CLAUDE.md`**: the `useAppForm`-based form field system and its full current field vocabulary.
- **`src/basiccn/CLAUDE.md`**: the tiptap v3 rich text editor.

### The `packages/ui` package (`packages/ui/src/`)

Deliberately decoupled from any one consumer's design system: it vendors its own copies of the shadcn/base-ui primitives it needs. Theming/styling stays the *consumer's* responsibility, `packages/ui`'s components use plain Tailwind utility classes referencing CSS custom properties (`bg-primary`, `text-destructive`, etc.); any consumer with a compatible Tailwind+shadcn setup (a real CSS variable for each token) makes them render correctly, regardless of which package actually defines those variables. `packages/config` is built the same way, fully off these vendored primitives, no shared design-system package dependency.

```
packages/ui/src/
  components/         vendored shadcn/base-ui primitives: badge, breadcrumb, button, calendar, checkbox, collapsible, combobox, dialog, drawer, dropdown-menu, field, input, input-group, label, popover, radio-group, select, separator, skeleton, sonner, switch, table, tabs, textarea, tooltip. `sonner.tsx` wraps `goey-toast` (a real dependency, not a vendored shadcn primitive). `code-editor.tsx` is the odd one out, not a vendored shadcn primitive but a real, form-agnostic CodeMirror 6 wrapper (`CodeEditor`, `@uiw/react-codemirror` + `@codemirror/{lang-javascript,lang-json,view}`), exported as `@baseconfig/ui/components/code-editor` for reuse outside `@baseconfig/ui/forms` too (`@baseconfig/core`'s `code` block uses it directly for its own corner language toggle). `dropdown-menu.tsx` wraps `@base-ui/react/menu` (a three-dot row menu for `ArrayField`'s move up/down/duplicate/delete actions), `tooltip.tsx` wraps `@base-ui/react/tooltip` (the same `ArrayField`'s "Drag to reorder"/"Row options" hints). See `src/forms/CLAUDE.md` for the `Code`/`JSON` fields built on top of it.
  lib/utils.ts        cn(): clsx + tailwind-merge
  basiccn/            the tiptap v3 rich text editor, see `src/basiccn/CLAUDE.md`. Exported as `@baseconfig/ui/basiccn` / `@baseconfig/ui/basiccn/preview`.
  forms/              the useAppForm-based form field system, see `src/forms/CLAUDE.md`. Exported as `@baseconfig/ui/forms`.
  tables/             tanstack-table wrapper (DataTable, pagination). Exported as `@baseconfig/ui/tables`.
  image/              TanstackImage. Exported as `@baseconfig/ui/image`.
```

No bare `.` root export, every subpath is explicit (`@baseconfig/ui/forms`, `@baseconfig/ui/basiccn`, etc.). `@baseconfig/ui/components/*` and `@baseconfig/ui/lib/*` are also real exports (for anything that needs a vendored primitive directly), reached indirectly through `@baseconfig/ui/forms` field components in most places, and directly for the admin UI shell.

**A Tailwind v4 gotcha worth knowing about, if content styled by this package ever renders unstyled**: Tailwind v4's scanner needs `@source` directives pointed at every directory whose classes should survive the production build. If a class used only inside `packages/ui`/`packages/config` (not also used somewhere in a consumer app) goes missing from compiled CSS, check the consumer's own global stylesheet for a matching `@source` entry first. Verify this kind of thing with a real check, grep the *built* CSS output for a distinctive class, not just "the build didn't error."

**Icon convention: `@tabler/icons-react` only, zero `lucide-react`.** Every icon import across the whole package (fields, tables, basiccn) uses tabler; `lucide-react` isn't a dependency at all.
