import { Badge, Box, Card, Collapsible, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import type { ExtractedAnswer, SurveyRunExtraction } from '../../shared/rpc-types'
import { normalizeDisplayResponse } from '../utils/normalize-response'
import ResponseHeatmap from './charts/ChoiceHeatmap'
import RankingChart from './charts/RankingChart'

interface QuestionGroup {
	questionId: string
	questionText: string
	responseFormat: 'free_text' | 'likert' | 'multiple_choice' | 'ranking'
	options?: string[]
	answers: ExtractedAnswer[]
	/** Answers grouped by agentConfigId */
	agentGroups: Map<string, ExtractedAnswer[]>
}

function groupByQuestion(extractions: SurveyRunExtraction[]): QuestionGroup[] {
	const questionMap = new Map<
		string,
		{
			questionText: string
			responseFormat: ExtractedAnswer['responseFormat']
			byAgent: Map<string, ExtractedAnswer[]>
			all: ExtractedAnswer[]
		}
	>()

	// Stable ordering: use first extraction's answer ordering
	const orderedIds: string[] = []

	for (const ext of extractions) {
		for (const a of ext.answers) {
			if (!questionMap.has(a.questionId)) {
				questionMap.set(a.questionId, {
					questionText: a.questionText,
					responseFormat: a.responseFormat,
					byAgent: new Map(),
					all: [],
				})
				orderedIds.push(a.questionId)
			}
			const entry = questionMap.get(a.questionId)!
			entry.all.push(a)
			const agentKey = ext.agentConfigId
			if (!entry.byAgent.has(agentKey)) entry.byAgent.set(agentKey, [])
			entry.byAgent.get(agentKey)!.push(a)
		}
	}

	return orderedIds.map((id) => {
		const entry = questionMap.get(id)!
		return {
			questionId: id,
			questionText: entry.questionText,
			responseFormat: entry.responseFormat,
			answers: entry.all,
			agentGroups: entry.byAgent,
		}
	})
}

function ConfidenceBadge({ answers }: { answers: ExtractedAnswer[] }) {
	const total = answers.length
	if (total === 0) return null
	const exact = answers.filter((a) => a.confidence === 'exact').length
	const inferred = answers.filter((a) => a.confidence === 'inferred').length
	const partial = answers.filter((a) => a.confidence === 'partial').length
	const failed = answers.filter((a) => a.confidence === 'failed').length

	if (failed === 0 && inferred === 0 && partial === 0) {
		return (
			<Badge colorPalette="green" size="sm">
				{exact}/{total} extracted
			</Badge>
		)
	}

	if (failed === 0) {
		return (
			<Badge colorPalette="yellow" size="sm">
				{exact + inferred + partial}/{total} extracted
				{inferred > 0 ? `, ${inferred} inferred` : ''}
			</Badge>
		)
	}

	return (
		<Badge colorPalette="red" size="sm">
			{exact + inferred + partial}/{total} extracted, {failed} failed
		</Badge>
	)
}

function QuestionChart({ group }: { group: QuestionGroup }) {
	switch (group.responseFormat) {
		case 'likert': {
			const LIKERT_LABELS = [
				'1 – Strongly Disagree',
				'2 – Disagree',
				'3 – Neutral',
				'4 – Agree',
				'5 – Strongly Agree',
			]
			return (
				<ResponseHeatmap
					agentGroups={group.agentGroups}
					categories={LIKERT_LABELS}
					getValue={(a) => (a.likertValue ? LIKERT_LABELS[a.likertValue - 1] : undefined)}
				/>
			)
		}
		case 'multiple_choice':
			return (
				<ResponseHeatmap
					agentGroups={group.agentGroups}
					categories={group.options ?? []}
					getValue={(a) => a.choiceValue ?? undefined}
				/>
			)
		case 'ranking':
			return <RankingChart agentGroups={group.agentGroups} options={group.options ?? []} />
		case 'free_text': {
			// Derive categories from actual responses, sorted by frequency
			const counts = new Map<string, number>()
			for (const answers of group.agentGroups.values()) {
				for (const a of answers) {
					const val = normalizeDisplayResponse(a.freeTextValue ?? a.raw)
					counts.set(val, (counts.get(val) ?? 0) + 1)
				}
			}
			const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label)
			return (
				<ResponseHeatmap
					agentGroups={group.agentGroups}
					categories={categories}
					getValue={(a) => normalizeDisplayResponse(a.freeTextValue ?? a.raw)}
				/>
			)
		}
		default:
			return null
	}
}

function ResponsesList({ agentGroups }: { agentGroups: Map<string, ExtractedAnswer[]> }) {
	const [open, setOpen] = useState(false)
	const total = [...agentGroups.values()].reduce((s, a) => s + a.length, 0)

	return (
		<Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
			<Collapsible.Trigger asChild>
				<HStack
					fontSize="xs"
					color="fg.muted"
					cursor="pointer"
					_hover={{ textDecoration: 'underline' }}
					gap={1}
				>
					<Box as={open ? FiChevronDown : FiChevronRight} boxSize={3} />
					<Text fontSize="xs">Responses ({total})</Text>
				</HStack>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Box maxH="300px" overflowY="auto" mt={1}>
					<VStack gap={1} align="stretch">
						{[...agentGroups.entries()].map(([agent, answers]) =>
							answers.map((a, idx) => (
								<Box key={`${agent}-${idx}`} bg="bg.subtle" px={2} py={1} borderRadius="sm">
									<Text fontSize="xs" color="fg.muted" mb={0.5}>
										{agent}
									</Text>
									<Text fontSize="xs" whiteSpace="pre-wrap">
										{a.raw}
									</Text>
								</Box>
							)),
						)}
					</VStack>
				</Box>
			</Collapsible.Content>
		</Collapsible.Root>
	)
}

interface SurveyResultsPanelProps {
	extractions: SurveyRunExtraction[] | undefined
	isLoading: boolean
	/** Original survey question options, keyed by questionId */
	questionOptions?: Map<string, string[]>
}

export default function SurveyResultsPanel({
	extractions,
	isLoading,
	questionOptions,
}: SurveyResultsPanelProps) {
	const groups = useMemo(() => (extractions ? groupByQuestion(extractions) : []), [extractions])

	// Enrich groups with options from the survey definition
	const enrichedGroups = useMemo(() => {
		if (!questionOptions) return groups
		return groups.map((g) => ({
			...g,
			options: questionOptions.get(g.questionId) ?? g.options,
		}))
	}, [groups, questionOptions])

	if (isLoading) {
		return (
			<Card.Root>
				<Card.Body>
					<HStack justify="center" py={6}>
						<Spinner size="sm" />
						<Text fontSize="sm" color="fg.muted">
							Extracting survey answers...
						</Text>
					</HStack>
				</Card.Body>
			</Card.Root>
		)
	}

	if (enrichedGroups.length === 0) return null

	return (
		<VStack gap={3} align="stretch">
			{enrichedGroups.map((group, idx) => (
				<Card.Root key={group.questionId} variant="outline">
					<Card.Body>
						<VStack gap={2} align="stretch">
							<HStack justify="space-between" wrap="wrap">
								<Text fontSize="sm" fontWeight="medium">
									Q{idx + 1}: {group.questionText}
								</Text>
								<HStack gap={2}>
									<Badge variant="outline" size="sm">
										{group.responseFormat.replace('_', ' ')}
									</Badge>
									<ConfidenceBadge answers={group.answers} />
								</HStack>
							</HStack>
							<QuestionChart group={group} />
							<ResponsesList agentGroups={group.agentGroups} />
						</VStack>
					</Card.Body>
				</Card.Root>
			))}
		</VStack>
	)
}
