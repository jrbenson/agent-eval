import { Tooltip } from '@/components/ui/tooltip'
import { Box, Flex, IconButton, Link, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import {
	FiBarChart2,
	FiBookOpen,
	FiChevronsLeft,
	FiChevronsRight,
	FiHome,
	FiList,
	FiPlay,
	FiSettings,
	FiTool,
} from 'react-icons/fi'
import UnsavedChangesDialog from './components/UnsavedChangesDialog'
import { useDataChangedListener } from './hooks/use-data-changed'
import { NavigationGuardContext } from './hooks/use-navigation-guard'
import { usePendingGuardAction } from './hooks/use-pending-guard-action'
import { useZoom } from './hooks/use-zoom'
import ContextPage from './pages/Context'
import DashboardPage from './pages/Dashboard'
import EvaluationsPage from './pages/Evaluations'
import ResultsPage from './pages/Results'
import ScenariosPage from './pages/Scenarios'
import SettingsPage from './pages/Settings'
import ToolsPage from './pages/Tools'

type Page = 'dashboard' | 'scenarios' | 'tools' | 'context' | 'evaluations' | 'results' | 'settings'

const NAV_ITEMS: { id: Page; label: string; icon: typeof FiHome }[] = [
	{ id: 'dashboard', label: 'Home', icon: FiHome },
	{ id: 'scenarios', label: 'Scenarios', icon: FiList },
	{ id: 'tools', label: 'Tools', icon: FiTool },
	{ id: 'context', label: 'Context', icon: FiBookOpen },
	{ id: 'evaluations', label: 'Evaluations', icon: FiPlay },
	{ id: 'results', label: 'Results', icon: FiBarChart2 },
	{ id: 'settings', label: 'Settings', icon: FiSettings },
]

function App() {
	const [currentPage, setCurrentPage] = useState<Page>('dashboard')
	const [pageParams, setPageParams] = useState<Record<string, string>>({})
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const qc = useQueryClient()

	useDataChangedListener()
	useZoom()

	const {
		handleCancel,
		handleDiscard,
		handleSave,
		hasPendingAction,
		runGuardedAction,
		saving,
		setGuard,
	} = usePendingGuardAction()

	const guardedNavigate = useCallback(
		(navigate: () => void) => {
			runGuardedAction(navigate)
		},
		[runGuardedAction],
	)

	// Invalidate all relevant caches when an evaluation run completes
	useEffect(() => {
		const handler = (e: Event) => {
			const { runId } = (e as CustomEvent).detail ?? {}
			qc.invalidateQueries({ queryKey: ['runs'] })
			qc.invalidateQueries({ queryKey: ['run'] })
			qc.invalidateQueries({ queryKey: ['allRunResults'] })
			qc.invalidateQueries({ queryKey: ['surveyRunAnswers'] })
			qc.invalidateQueries({ queryKey: ['taskRunAnalysis'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
			if (runId) {
				qc.invalidateQueries({ queryKey: ['runResults', runId] })
				qc.invalidateQueries({ queryKey: ['runStatus', runId] })
				qc.invalidateQueries({ queryKey: ['run', runId] })
			}
		}
		window.addEventListener('eval-complete', handler)
		return () => window.removeEventListener('eval-complete', handler)
	}, [qc])

	const renderPage = () => {
		switch (currentPage) {
			case 'dashboard':
				return (
					<DashboardPage
						onNavigate={(page, params) => {
							guardedNavigate(() => {
								setCurrentPage(page as Page)
								setPageParams(params ?? {})
							})
						}}
					/>
				)
			case 'scenarios':
				return <ScenariosPage />
			case 'tools':
				return <ToolsPage />
			case 'context':
				return <ContextPage />
			case 'evaluations':
				return <EvaluationsPage />
			case 'results':
				return <ResultsPage initialRunId={pageParams.runId} />
			case 'settings':
				return <SettingsPage />
		}
	}

	return (
		<NavigationGuardContext.Provider value={{ setGuard }}>
			<Flex h="100%" overflow="hidden" bg="bg" color="fg">
				{/* Sidebar */}
				<Box
					w={sidebarCollapsed ? '60px' : '220px'}
					bg="bg.panel"
					color="fg"
					py={4}
					flexShrink={0}
					display="flex"
					flexDirection="column"
					position="relative"
					overflow="hidden"
					transition="width 0.2s"
					borderRightWidth="1px"
					borderColor="border.subtle"
				>
					{!sidebarCollapsed && (
						<Text
							position="absolute"
							bottom={12}
							left={4}
							fontSize="6xl"
							fontWeight="bold"
							color="fg.subtle"
							opacity={0.1}
							lineHeight="1"
							userSelect="none"
							pointerEvents="none"
							css={{
								writingMode: 'vertical-rl',
								transform: 'rotate(180deg)',
							}}
							whiteSpace="nowrap"
						>
							Agent Eval
						</Text>
					)}
					<VStack gap={1} align="stretch" flex={1} mt={2}>
						{NAV_ITEMS.map((item) => (
							<Tooltip
								key={item.id}
								content={item.label}
								positioning={{ placement: 'right' }}
								disabled={!sidebarCollapsed}
							>
								<Link
									onClick={() => {
										guardedNavigate(() => {
											setCurrentPage(item.id)
											setPageParams({})
										})
									}}
									px={sidebarCollapsed ? 0 : 4}
									py={2}
									display="flex"
									alignItems="center"
									justifyContent={sidebarCollapsed ? 'center' : 'flex-start'}
									gap={3}
									borderRadius="md"
									mx={2}
									bg={currentPage === item.id ? 'bg.emphasized' : 'transparent'}
									_hover={{ bg: 'bg.subtle', textDecoration: 'none' }}
									fontSize="sm"
									fontWeight={currentPage === item.id ? 'semibold' : 'normal'}
								>
									<Box as={item.icon} boxSize={4} />
									{!sidebarCollapsed && <Text>{item.label}</Text>}
								</Link>
							</Tooltip>
						))}
					</VStack>
					<Box px={2} pb={1} display="flex" justifyContent="flex-end">
						<IconButton
							aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
							size="sm"
							variant="ghost"
							color="fg.muted"
							_hover={{ color: 'fg', bg: 'bg.subtle' }}
							onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
						>
							<Box as={sidebarCollapsed ? FiChevronsRight : FiChevronsLeft} />
						</IconButton>
					</Box>
				</Box>

				{/* Main content */}
				<Box flex={1} minW={0} overflow="hidden" bg="bg">
					{renderPage()}
				</Box>
			</Flex>
			<UnsavedChangesDialog
				open={hasPendingAction}
				onSave={handleSave}
				onDiscard={handleDiscard}
				onCancel={handleCancel}
				saving={saving}
			/>
		</NavigationGuardContext.Provider>
	)
}

export default App
