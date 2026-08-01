// Minimal shim for standalone `tsc` runs of this package: `@baseconfig/ui`'s
// `sonner.tsx` has a side-effect `import '...css'`, which Vite/bundler-mode
// resolution handles natively but plain `tsc` doesn't know about unless
// something declares it. `www`'s own tsconfig gets this for free via
// `vite/client` (a devDependency there); this package can't depend on `vite`
// itself just for an ambient type, so it declares the one thing it needs
// directly instead.
declare module '*.css' {
	const _unused: undefined
	export default _unused
}
