import { TagsInput } from '@chakra-ui/react'

interface EnumTagInputProps {
	values: string[]
	onChange: (values: string[]) => void
}

export default function EnumTagInput({ values, onChange }: EnumTagInputProps) {
	return (
		<TagsInput.Root
			size="sm"
			value={values}
			onValueChange={(details) => onChange(details.value)}
			blurBehavior="add"
			delimiter=","
			validate={(e) => {
				const trimmed = e.inputValue.trim()
				return trimmed.length > 0 && !values.includes(trimmed)
			}}
		>
			<TagsInput.Control>
				<TagsInput.Items />
				<TagsInput.Input placeholder="add value…" fontSize="xs" />
			</TagsInput.Control>
		</TagsInput.Root>
	)
}
