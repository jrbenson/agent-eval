import { Box, CloseButton } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import { AppProviders } from './app/AppProviders'
import { createMainviewQueryClient } from './app/query-client'
import UnsavedChangesDialog from './components/UnsavedChangesDialog'
import { useDataChangedListener } from './hooks/use-data-changed'
import { NavigationGuardContext } from './hooks/use-navigation-guard'
import { usePendingGuardAction } from './hooks/use-pending-guard-action'
import { PopoutProvider } from './hooks/use-popout'
import { TrailingActionProvider } from './hooks/use-trailing-action'
import './index.css'
import { rpcRequest, setPopoutDirtyRef } from './rpc'

import ContentBuilder from './pages/ContentBuilder'
import ContentSetBuilder from './pages/ContentSetBuilder'
import EvaluationEditor from './pages/EvaluationEditor'
import { RunDetail } from './pages/RunDetail'
import SkillBuilder from './pages/SkillBuilder'
import SkillSetBuilder from './pages/SkillSetBuilder'
import SurveyBuilder from './pages/SurveyBuilder'
import TaskBuilder from './pages/TaskBuilder'
import ToolDefinitionBuilder from './pages/ToolDefinitionBuilder'
import ToolSetBuilder from './pages/ToolSetBuilder'

const queryClient = createMainviewQueryClient()

// biome-ignore lint/suspicious/noExplicitAny: Electrobun injects this globally
const windowId: number = (window as any).__electrobunWindowId ?? 0

function closeWindow() {
	rpcRequest.closePopoutWindow({ windowId })
}

const noop = () => {}

function renderBuilder(entityType: string, entityId: string) {
	switch (entityType) {
		case 'toolDefinition':
			return <ToolDefinitionBuilder toolDefId={entityId} onBack={closeWindow} breadcrumbLabel="" />
		case 'toolSet':
			return <ToolSetBuilder toolSetId={entityId} onBack={closeWindow} />
		case 'skill':
			return <SkillBuilder skillId={entityId} onBack={closeWindow} breadcrumbLabel="" />
		case 'skillSet':
			return <SkillSetBuilder skillSetId={entityId} onBack={closeWindow} />
		case 'content':
			return <ContentBuilder contentId={entityId} onBack={closeWindow} breadcrumbLabel="" />
		case 'contentSet':
			return <ContentSetBuilder contentSetId={entityId} onBack={closeWindow} />
		case 'task':
			return <TaskBuilder taskId={entityId} onBack={closeWindow} />
		case 'survey':
			return <SurveyBuilder surveyId={entityId} onBack={closeWindow} />
		case 'evaluation':
			return <EvaluationEditor evaluationId={entityId} onBack={closeWindow} onViewRun={noop} />
		case 'result':
			return <RunDetail runId={entityId} breadcrumbs={[]} />
		default:
			return <div>Unknown entity type: {entityType}</div>
	}
}

function DataChangedWatcher() {
	useDataChangedListener()
	return null
}

export default function PopoutShell({
	entityType,
	entityId,
}: {
	entityType: string
	entityId: string
}) {
	// For resolveCloseGuard RPC — bun calls this, we resolve the promise when user picks
	const resolveCloseRef = useRef<((action: 'saved' | 'discarded' | 'cancelled') => void) | null>(
		null,
	)

	const resolveCloseAction = useCallback((action: 'saved' | 'discarded' | 'cancelled') => {
		resolveCloseRef.current?.(action)
		resolveCloseRef.current = null
	}, [])

	const {
		guardRef,
		handleCancel,
		handleDiscard,
		handleSave,
		hasPendingAction,
		runGuardedAction,
		saving,
		setGuard,
		setPendingAction,
	} = usePendingGuardAction({
		onDiscard: () => resolveCloseAction('discarded'),
		onCancel: () => resolveCloseAction('cancelled'),
		onSaveSuccess: () => resolveCloseAction('saved'),
	})

	const handleClose = useCallback(() => {
		runGuardedAction(closeWindow)
	}, [runGuardedAction])

	// Register dirty state with RPC layer for bun→webview requests
	useEffect(() => {
		setPopoutDirtyRef({
			isDirty: () => guardRef.current?.isDirty() ?? false,
			resolveClose: () =>
				new Promise<'saved' | 'discarded' | 'cancelled'>((resolve) => {
					const guard = guardRef.current
					if (!guard || !guard.isDirty()) {
						resolve('discarded')
						return
					}
					// Cancel any previous pending resolve to prevent dangling promises
					if (resolveCloseRef.current) {
						resolveCloseAction('cancelled')
					}
					resolveCloseRef.current = resolve
					setPendingAction(() => closeWindow)
				}),
		})
		return () => setPopoutDirtyRef(null)
	}, [guardRef, resolveCloseAction, setPendingAction])

	const closeButton = (
		<CloseButton aria-label="Close window" size="lg" variant="ghost" onClick={handleClose} />
	)

	return (
		<AppProviders defaultTheme="dark" queryClient={queryClient}>
			<DataChangedWatcher />
			<PopoutProvider value={true}>
				<TrailingActionProvider value={closeButton}>
					<NavigationGuardContext.Provider value={{ setGuard }}>
						<Box h="100%" overflow="auto" bg="bg" color="fg">
							{renderBuilder(entityType, entityId)}
						</Box>
						<UnsavedChangesDialog
							open={hasPendingAction}
							onSave={handleSave}
							onDiscard={handleDiscard}
							onCancel={handleCancel}
							saving={saving}
						/>
					</NavigationGuardContext.Provider>
				</TrailingActionProvider>
			</PopoutProvider>
		</AppProviders>
	)
}
