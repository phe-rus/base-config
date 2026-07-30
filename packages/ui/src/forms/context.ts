import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { controls } from './controls'
import { fields } from './fields'

export const { fieldContext, useFieldContext, formContext, useFormContext } =
	createFormHookContexts()

export const { useAppForm } = createFormHook({
	fieldComponents: fields,
	fieldContext,
	formComponents: controls,
	formContext
})
