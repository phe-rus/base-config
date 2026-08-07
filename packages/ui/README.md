# @baseconfig/ui

The sibling primitive library behind [baseconfig](https://github.com/phe-rus/baseconfig): vendored shadcn/base-ui components, a Tiptap v3 rich text editor, and the `useAppForm`-based form field system [`@baseconfig/core`](https://www.npmjs.com/package/@baseconfig/core) renders every field through.

See the [main repo README](https://github.com/phe-rus/baseconfig#readme) for the bigger picture. See [`CLAUDE.md`](https://github.com/phe-rus/baseconfig/blob/main/packages/ui/CLAUDE.md) for the deep internals.

## Install

```bash
bun add @baseconfig/ui
```

No bare `.` root export, every subpath is explicit.

## What's in here

- **`@baseconfig/ui/components/*`**: vendored shadcn/base-ui primitives (button, dialog, drawer, select, tabs, table, combobox, calendar, and more), plus a real CodeMirror 6 wrapper (`code-editor`). Deliberately decoupled from any one consumer's design system: plain Tailwind utility classes referencing CSS custom properties, so any compatible Tailwind+shadcn setup renders them correctly.
- **`@baseconfig/ui/forms`**: the `useAppForm`-based field system: Array, Checkbox, Code, Combobox, DatePicker, Email, Hidden, Input, JSON, KeywordsInput, Number, Password/ConfirmPassword, Point, RadioGroup, RichText, Select, Slug, Switch, Textarea, Upload.
- **`@baseconfig/ui/basiccn`** / **`@baseconfig/ui/basiccn/preview`**: the Tiptap v3 rich text editor (`Editor`) and its read-only counterpart (`Preview`), built from individual extensions rather than `@tiptap/starter-kit`.
- **`@baseconfig/ui/tables`**: a tanstack-table wrapper (`DataTable`, pagination).
- **`@baseconfig/ui/themes`**: a `next-themes`-style light/dark theme provider (`useTheme`, class/data-attribute based).

## Peer dependencies

`react`, `react-dom`, `@tanstack/react-form`, see [`package.json`](./package.json) for exact ranges.

## License

MIT
