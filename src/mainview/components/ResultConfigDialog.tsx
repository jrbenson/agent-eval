import { Badge, HStack, Text, VStack } from '@chakra-ui/react'
import AppDialog from './AppDialog'
import CodeEditor from './CodeEditor'

export interface ResultConfigDialogRow {
	label: string
	value: string
}

export default function ResultConfigDialog({
	open,
	onOpenChange,
	title,
	badgeLabel,
	summary,
	data,
	emptyMessage,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	badgeLabel?: string
	summary: ResultConfigDialogRow[]
	data: unknown | null | undefined
	emptyMessage?: string
}) {
	return (
		<AppDialog open={open} onOpenChange={onOpenChange} title={title} size="xl">
			{!data ? (
				<Text fontSize="sm" color="fg.muted">
					{emptyMessage ?? 'No data available.'}
				</Text>
			) : (
				<VStack align="stretch" gap={4}>
					{(badgeLabel || summary.length > 0) && (
						<VStack align="stretch" gap={2}>
							{badgeLabel && (
								<Badge size="sm" width="fit-content" variant="subtle">
									{badgeLabel}
								</Badge>
							)}
							{summary.map((row) => (
								<HStack key={row.label} justify="space-between" align="start">
									<Text fontSize="sm" color="fg.muted">
										{row.label}
									</Text>
									<Text fontSize="sm" textAlign="end" maxW="70%">
										{row.value}
									</Text>
								</HStack>
							))}
						</VStack>
					)}
					<CodeEditor
						value={JSON.stringify(data, null, 2)}
						mode="json"
						readOnly
						minLines={12}
						maxLines={40}
						name={`result-config-${title}`}
					/>
				</VStack>
			)}
		</AppDialog>
	)
}
