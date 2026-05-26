import {
	Badge,
	Button,
	Card,
	HStack,
	Heading,
	SimpleGrid,
	Table,
	Text,
	VStack,
} from '@chakra-ui/react'
import ClickableRow from '../components/ClickableRow'
import ListPageLayout from '../components/ListPageLayout'
import RunStatusBadge from '../components/RunStatusBadge'
import { useDashboardStats } from '../hooks/use-results'
import { useEvaluations } from '../hooks/use-results'

interface DashboardProps {
	onNavigate: (page: string, params?: Record<string, string>) => void
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
	const { data: stats } = useDashboardStats()
	const { data: evaluationsData } = useEvaluations()

	const resultCount = stats?.resultCount ?? 0
	const recentRuns = stats?.recentRuns ?? []
	const evaluations = evaluationsData ?? []
	const evaluationNameMap = new Map(evaluations.map((e) => [e.id, e.label]))

	return (
		<ListPageLayout
			title="Home"
			description="Create and manage agent evaluations using UX research methods."
		>
			<VStack align="stretch" gap={6}>
				<SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={6}>
					<Card.Root
						cursor="pointer"
						_hover={{ shadow: 'lg' }}
						onClick={() => onNavigate('scenarios')}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								onNavigate('scenarios')
							}
						}}
						tabIndex={0}
						h="100%"
					>
						<Card.Body display="flex" flexDirection="column">
							<Heading size="sm" mb={2}>
								Scenarios
							</Heading>
							<Text fontSize="sm" color="fg.muted" flex={1}>
								Create and manage surveys and tasks for agent evaluation.
							</Text>
							<Button mt={4} size="sm" colorPalette="blue" variant="solid" alignSelf="start">
								View Scenarios
							</Button>
						</Card.Body>
					</Card.Root>
					<Card.Root
						cursor="pointer"
						_hover={{ shadow: 'lg' }}
						onClick={() => onNavigate('context')}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								onNavigate('context')
							}
						}}
						tabIndex={0}
						h="100%"
					>
						<Card.Body display="flex" flexDirection="column">
							<Heading size="sm" mb={2}>
								Context
							</Heading>
							<Text fontSize="sm" color="fg.muted" flex={1}>
								Manage skills, content, and knowledge sets for agent context.
							</Text>
							<Button mt={4} size="sm" colorPalette="blue" variant="solid" alignSelf="start">
								Manage Context
							</Button>
						</Card.Body>
					</Card.Root>
					<Card.Root
						cursor="pointer"
						_hover={{ shadow: 'lg' }}
						onClick={() => onNavigate('tools')}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								onNavigate('tools')
							}
						}}
						tabIndex={0}
						h="100%"
					>
						<Card.Body display="flex" flexDirection="column">
							<Heading size="sm" mb={2}>
								Tools
							</Heading>
							<Text fontSize="sm" color="fg.muted" flex={1}>
								Define reusable tool definitions with schemas and mock responses for agent testing.
							</Text>
							<Button mt={4} size="sm" colorPalette="blue" variant="solid" alignSelf="start">
								Manage Tools
							</Button>
						</Card.Body>
					</Card.Root>
					<Card.Root
						cursor="pointer"
						_hover={{ shadow: 'lg' }}
						onClick={() => onNavigate('evaluations')}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								onNavigate('evaluations')
							}
						}}
						tabIndex={0}
						h="100%"
					>
						<Card.Body display="flex" flexDirection="column">
							<Heading size="sm" mb={2}>
								Evaluations
							</Heading>
							<Text fontSize="sm" color="fg.muted" flex={1}>
								Configure agent matrices and run scenarios across multiple models and settings.
							</Text>
							<Button mt={4} size="sm" colorPalette="blue" variant="solid" alignSelf="start">
								Go to Evaluations
							</Button>
						</Card.Body>
					</Card.Root>
				</SimpleGrid>

				<Card.Root>
					<Card.Header>
						<HStack justify="space-between">
							<Heading size="sm">Recent Results</Heading>
							{resultCount > 0 && (
								<Button size="xs" variant="ghost" onClick={() => onNavigate('results')}>
									View All ({resultCount})
								</Button>
							)}
						</HStack>
					</Card.Header>
					<Card.Body>
						{recentRuns.length === 0 ? (
							<Text color="fg.muted" fontSize="sm">
								No evaluation runs yet. Create a scenario and run an evaluation to get started.
							</Text>
						) : (
							<Table.ScrollArea>
								<Table.Root size="sm">
									<Table.Body>
										{recentRuns.map((run) => {
											const evalName =
												evaluationNameMap.get(run.sourceEvaluationId) ?? 'Unknown Evaluation'
											return (
												<ClickableRow
													key={run.id}
													onClick={() => onNavigate('results', { runId: run.id })}
												>
													<Table.Cell width="1" whiteSpace="nowrap">
														<Badge variant="subtle" colorPalette="gray">
															{run.scenario.type === 'survey' ? 'Survey' : 'Task'}
														</Badge>
													</Table.Cell>
													<Table.Cell fontWeight="medium">{evalName}</Table.Cell>
													<Table.Cell width="1" whiteSpace="nowrap">
														<RunStatusBadge status={run.status} />
													</Table.Cell>
													<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
														{run.completedTrials}/{run.totalTrials} trials
													</Table.Cell>
													<Table.Cell
														width="1"
														whiteSpace="nowrap"
														color="fg.muted"
														fontSize="xs"
														textAlign="end"
													>
														{new Date(run.createdAt).toLocaleString()}
													</Table.Cell>
												</ClickableRow>
											)
										})}
									</Table.Body>
								</Table.Root>
							</Table.ScrollArea>
						)}
					</Card.Body>
				</Card.Root>
			</VStack>
		</ListPageLayout>
	)
}
