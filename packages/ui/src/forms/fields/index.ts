import { ArrayField } from './Array'
import { Checkbox } from './Checkbox'
import { Code } from './Code'
import { Combobox } from './Combobox'
import { ConfirmPassword } from './ConfirmPassword'
import { DatePicker } from './DatePicker'
import { Email } from './Email'
import { Hidden } from './Hidden'
import { Input } from './Input'
import { JSON as JSONField } from './JSON'
import { KeywordsInput } from './KeywordsInput'
import { Number as NumberField } from './Number'
import { Password } from './Password'
import { Point } from './Point'
import { RadioGroup } from './RadioGroup'
import { RichText } from './RichText'
import { Select } from './Select'
import { Slug } from './Slug'
import { Switch } from './Switch'
import { Textarea } from './Textarea'
import { Upload } from './Upload'

export const fields = {
	Checkbox,
	Code,
	Combobox,
	ConfirmPassword,
	DatePicker,
	Email,
	Hidden,
	Input,
	JSON: JSONField,
	RadioGroup,
	Number: NumberField,
	Password,
	Point,
	Select,
	Slug,
	Switch,
	Textarea,
	Upload,
	RichText,
	ArrayField,
	KeywordsInput
}

export type { BaseFieldProps, SelectOption } from './shared/types'
export type { PointValue } from './Point'
