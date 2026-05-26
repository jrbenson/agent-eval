import { HStack, Spinner, Text } from '@chakra-ui/react'
import { FiCheck } from 'react-icons/fi'
import type { AutosaveStatus } from '../hooks/use-autosave'

export function SaveIndicator({ status }: { status: AutosaveStatus }) {
	if (status === 'idle') return null

	if (status === 'saving') {
		return (
			<HStack gap={1} color="fg.muted">
				<Spinner size="xs" />
				<Text fontSize="xs">Saving…</Text>
			</HStack>
		)
	}

	if (status === 'saved') {
		return (
			<HStack gap={1} color="fg.success">
				<FiCheck size={12} />
				<Text fontSize="xs">Saved</Text>
			</HStack>
		)
	}

	// error
	return (
		<Text fontSize="xs" color="fg.error">
			Save failed
		</Text>
	)
}
