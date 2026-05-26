import { Box, Card, DataList, Heading, Text, VStack } from '@chakra-ui/react'
import CodeEditor from '../components/CodeEditor'
import DrillInLayout from '../components/DrillInLayout'
import LoadingBlock from '../components/LoadingBlock'
import RunStatusBadge from '../components/RunStatusBadge'
import TranscriptView from '../components/transcript/TranscriptView'
import UtilityLlmCallView from '../components/transcript/UtilityLlmCallView'
import { useTrialData } from '../hooks/use-results'

export function TrialDetail({
	runId,
	trialId,
	trialLabel,
	breadcrumbs,
}: {
	runId: string
	trialId: string
	trialLabel: string
	breadcrumbs: { label: string; onClick: () => void }[]
}) {
	const { data: trial, isLoading } = useTrialData(runId, trialId)

	const inlineStatus = trial ? (
		<RunStatusBadge status={trial.status} fontSize="xs" error={trial.error} />
	) : undefined

	return (
		<DrillInLayout title={trialLabel} breadcrumbs={breadcrumbs} inlineStatus={inlineStatus}>
			<VStack gap={4} align="stretch">
				{isLoading && <LoadingBlock label="Loading trial data..." />}

				{!isLoading && !trial && (
					<Text color="fg.muted" fontSize="sm">
						Trial data not found.
					</Text>
				)}

				{trial && (
					<Card.Root variant="outline" size="sm">
						<Card.Body>
							<DataList.Root orientation="horizontal" size="sm" variant="subtle">
								<DataList.Item>
									<DataList.ItemLabel>Agent</DataList.ItemLabel>
									<DataList.ItemValue fontFamily="mono">
										{trial.agent.provider}/{trial.agent.model}
									</DataList.ItemValue>
								</DataList.Item>
								<DataList.Item>
									<DataList.ItemLabel>Steps</DataList.ItemLabel>
									<DataList.ItemValue>{trial.metrics.stepCount}</DataList.ItemValue>
								</DataList.Item>
								<DataList.Item>
									<DataList.ItemLabel>Tokens</DataList.ItemLabel>
									<DataList.ItemValue>{trial.metrics.totalTokens}</DataList.ItemValue>
								</DataList.Item>
								<DataList.Item>
									<DataList.ItemLabel>Latency</DataList.ItemLabel>
									<DataList.ItemValue>
										{(trial.metrics.totalLatencyMs / 1000).toFixed(1)}s
									</DataList.ItemValue>
								</DataList.Item>
							</DataList.Root>
						</Card.Body>
					</Card.Root>
				)}

				{trial && <TranscriptView trial={trial} />}

				{trial?.persistenceSnapshot && trial.persistenceSnapshot.length > 0 && (
					<Box>
						<Heading size="sm" mb={2}>
							Persistence Snapshot ({trial.persistenceSnapshot.length}{' '}
							{trial.persistenceSnapshot.length === 1 ? 'name' : 'names'})
						</Heading>
						<VStack gap={2} align="stretch">
							{trial.persistenceSnapshot.map((entry) => (
								<Card.Root key={entry.name} variant="outline" size="sm">
									<Card.Body py={2} px={3}>
										<Text fontSize="xs" fontFamily="mono" fontWeight="medium" mb={1}>
											{entry.name}
										</Text>
										<CodeEditor
											value={entry.content}
											onChange={() => {}}
											mode="text"
											readOnly
											minLines={1}
											maxLines={10}
											name={`persistence-${entry.name}`}
										/>
									</Card.Body>
								</Card.Root>
							))}
						</VStack>
					</Box>
				)}

				{trial?.utilityLlmCalls && trial.utilityLlmCalls.length > 0 && (
					<Box>
						<Heading size="sm" mb={2}>
							Utility LLM Calls ({trial.utilityLlmCalls.length})
						</Heading>
						<VStack gap={2} align="stretch">
							{trial.utilityLlmCalls.map((call, i) => (
								<UtilityLlmCallView key={i} call={call} index={i} />
							))}
						</VStack>
					</Box>
				)}
			</VStack>
		</DrillInLayout>
	)
}
