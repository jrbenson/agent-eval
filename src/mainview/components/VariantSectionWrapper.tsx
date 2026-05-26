import { HStack, IconButton, Switch, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { FiRotateCcw } from 'react-icons/fi'
import { SectionHeader } from './SectionHeader'

interface OverrideToggleProps {
	enabled: boolean
	onToggle: (enabled: boolean) => void
	onReset?: () => void
}

/** Compact inline toggle + reset icon for use in SectionHeader trailing slot. */
export function OverrideToggle({ enabled, onToggle, onReset }: OverrideToggleProps) {
	return (
		<HStack gap={1}>
			<Text fontSize="xs" color="fg.muted">
				Override
			</Text>
			<Switch.Root checked={enabled} onCheckedChange={(e) => onToggle(e.checked)} size="sm">
				<Switch.HiddenInput />
				<Switch.Control>
					<Switch.Thumb />
				</Switch.Control>
			</Switch.Root>
			{enabled && onReset && (
				<IconButton
					aria-label="Reset from primary"
					size="2xs"
					variant="ghost"
					colorPalette="gray"
					onClick={onReset}
				>
					<FiRotateCcw />
				</IconButton>
			)}
		</HStack>
	)
}

interface VariantSectionWrapperProps {
	title: string
	description: string
	trailing?: ReactNode
}

/**
 * Renders a section header when an override is disabled.
 * Shows the header (with toggle) but no editable content.
 */
export function VariantSectionWrapper({
	title,
	description,
	trailing,
}: VariantSectionWrapperProps) {
	return <SectionHeader title={title} description={description} trailing={trailing} />
}
