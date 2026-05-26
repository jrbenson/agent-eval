import { Field, HStack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import ToggleTip from './ToggleTip'

interface FieldHeaderProps {
	label: string
	description?: string
	action?: ReactNode
	size?: 'sm' | 'xs'
	/** Render as Field.Label for use inside Field.Root (preserves htmlFor accessibility) */
	asFieldLabel?: boolean
}

export default function FieldHeader({
	label,
	description,
	action,
	size = 'xs',
	asFieldLabel = false,
}: FieldHeaderProps) {
	const LabelElement = asFieldLabel ? Field.Label : Text

	return (
		<HStack justify="space-between" align="center" mb={0.5}>
			<HStack gap={1}>
				<LabelElement fontSize={size} fontWeight="medium">
					{label}
				</LabelElement>
				{description && <ToggleTip content={description} />}
			</HStack>
			{action}
		</HStack>
	)
}
