export interface Swatch {
	label: string
	value: string
}

/**
 * Named hues shared by both the text-color and highlight palettes, so the
 * two stay visually paired (picking "Teal" text color and "Teal" highlight
 * are the same underlying hue) instead of two hand-maintained, drifting
 * lists. Lightness/chroma tuned per hue (not one flat lightness) so warm
 * hues like yellow don't read washed-out next to cool ones like blue.
 */
const hues: {
	label: string
	lightness: number
	chroma: number
	hue: number
}[] = [
	{ label: 'Black', lightness: 18, chroma: 0, hue: 0 },
	{ label: 'White', lightness: 97, chroma: 0, hue: 0 },
	{ label: 'Gray', lightness: 55, chroma: 0, hue: 0 },
	{ label: 'Red', lightness: 58, chroma: 0.19, hue: 25 },
	{ label: 'Orange', lightness: 65, chroma: 0.17, hue: 55 },
	{ label: 'Amber', lightness: 72, chroma: 0.16, hue: 75 },
	{ label: 'Yellow', lightness: 78, chroma: 0.15, hue: 95 },
	{ label: 'Olive', lightness: 48, chroma: 0.09, hue: 105 },
	{ label: 'Lime', lightness: 72, chroma: 0.16, hue: 120 },
	{ label: 'Green', lightness: 60, chroma: 0.13, hue: 145 },
	{ label: 'Teal', lightness: 60, chroma: 0.11, hue: 170 },
	{ label: 'Cyan', lightness: 65, chroma: 0.1, hue: 200 },
	{ label: 'Sky', lightness: 62, chroma: 0.12, hue: 225 },
	{ label: 'Blue', lightness: 58, chroma: 0.14, hue: 250 },
	{ label: 'Indigo', lightness: 55, chroma: 0.16, hue: 270 },
	{ label: 'Purple', lightness: 58, chroma: 0.16, hue: 300 },
	{ label: 'Fuchsia', lightness: 60, chroma: 0.19, hue: 320 },
	{ label: 'Pink', lightness: 65, chroma: 0.17, hue: 350 },
	{ label: 'Rose', lightness: 60, chroma: 0.19, hue: 10 }
]

/**
 * Solid mid-tone colors for the `Color` mark (inline `style="color: …"`).
 * Chosen at ~55-78% oklch lightness so a single palette stays legible on
 * both light and dark editor backgrounds — the same tradeoff every rich
 * text editor with absolute text colors makes.
 */
export const textColors: Swatch[] = [
	{ label: 'Default', value: '' },
	...hues.map(({ label, lightness, chroma, hue }) => ({
		label,
		value: `oklch(${lightness}% ${chroma} ${hue})`
	}))
]

/**
 * `Highlight` mark backgrounds — each is a `color-mix()` at ~30-40% opacity
 * (same trick `typeset.css`'s own `mark` rule uses) rather than a solid
 * pastel, so `color: inherit` text stays readable in both themes instead
 * of going light-on-light in dark mode.
 */
export const highlightColors: Swatch[] = [
	{ label: 'Default', value: '' },
	...hues.map(({ label, lightness, chroma, hue }) => ({
		label,
		value: `color-mix(in oklab, oklch(${lightness}% ${chroma} ${hue}) 35%, transparent)`
	}))
]

export const fontFamilies: Swatch[] = [
	{ label: 'Default', value: '' },
	{ label: 'Sans', value: 'var(--font-sans, ui-sans-serif)' },
	{ label: 'Serif', value: 'ui-serif, Georgia, serif' },
	{ label: 'Mono', value: 'var(--font-mono, ui-monospace)' },
	{ label: 'Rounded', value: 'ui-rounded, system-ui, sans-serif' },
	{ label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
	{ label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
	{ label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
	{ label: 'Courier New', value: '"Courier New", Courier, monospace' },
	{ label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
	{ label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
	{ label: 'Garamond', value: 'Garamond, "Cormorant Garamond", serif' },
	{ label: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
	{ label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
	{ label: 'Impact', value: 'Impact, "Arial Black", sans-serif' }
]
