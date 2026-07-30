import type { GooeyToasterProps } from 'goey-toast'
import { GooeyToaster as GooeyToasterPrimitive, gooeyToast } from 'goey-toast'
import 'goey-toast/styles.css'

export type {
	GooeyPromiseData,
	GooeyToastAction,
	GooeyToastClassNames,
	GooeyToastOptions,
	GooeyToastTimings
} from 'goey-toast'
export { gooeyToast as t }
export type { GooeyToasterProps }

function Toaster(props: GooeyToasterProps) {
	return <GooeyToasterPrimitive position='bottom-right' {...props} richColors />
}

export { Toaster }
