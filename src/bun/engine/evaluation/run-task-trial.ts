import type { AgentConfigParams } from '../../../shared/rpc-types'
import type {
	InlineSkill,
	TaskContentRef,
	TaskSkillRef,
	TaskToolRef,
} from '../../../shared/schemas/task.schema'
import { appendTrialSummary, saveTrial } from '../../data/runs'
import { resolveTaskContent } from '../content-resolver'
import type {
	HarnessConfig,
	HarnessResult,
	ResolvedToolDef,
	SubagentConfig,
	ToolDef,
	ToolSearchConfig,
} from '../harness'
import { runAgentWithResolvedTools, runAgentWithTools } from '../harness'
import { type ResolvedSkill, resolveTaskSkills } from '../skill-resolver'
import { resolveTaskTools } from '../tool-resolver'
import { createTrialSummary, extractTrialData } from '../trial-extractor'
import { runMultiTurnTask } from './run-multi-turn-task'

type TaskScenario = {
	taskPrompts: string[]
	systemPrompt?: string
	toolRefs?: {
		type?: string
		toolDefinitionId?: string
		toolSetId?: string
	}[]
	toolDefinitions?: ToolDef[]
	initialPersistence?: Array<{ name: string; content: string }>
	contentRefs?: TaskContentRef[]
	skillRefs?: TaskSkillRef[]
	inlineSkills?: InlineSkill[]
	goalConditions?: import('../../../shared/schemas/task.schema').GoalCondition[]
	simulateWithLlm?: boolean
	simulationInstructions?: string
}

function mergeTaskPersistence(task: TaskScenario, trialId: string) {
	let mergedPersistence = task.initialPersistence ?? []
	if (task.contentRefs && task.contentRefs.length > 0) {
		const { entries, warnings } = resolveTaskContent(task.contentRefs)
		if (warnings.length > 0) {
			console.warn(`[runner] Content resolution warnings for trial ${trialId}:`, warnings)
		}

		const keyMap = new Map<string, { name: string; content: string }>()
		for (const entry of entries) {
			keyMap.set(entry.name, { name: entry.name, content: entry.content })
		}
		for (const entry of mergedPersistence) {
			keyMap.set(entry.name, entry)
		}
		mergedPersistence = [...keyMap.values()]
	}

	return mergedPersistence
}

function resolveSkills(task: TaskScenario, trialId: string): ResolvedSkill[] {
	const hasSkillRefs = task.skillRefs && task.skillRefs.length > 0
	const hasInlineSkills = task.inlineSkills && task.inlineSkills.length > 0
	if (!hasSkillRefs && !hasInlineSkills) {
		return []
	}

	const { skills, warnings } = resolveTaskSkills(task.skillRefs ?? [], task.inlineSkills ?? [])
	if (warnings.length > 0) {
		console.warn(`[runner] Skill resolution warnings for trial ${trialId}:`, warnings)
	}
	return skills
}

function buildTaskRuntimeOptions(args: {
	sourceParams: AgentConfigParams
	definitionToolSearchMode: 'keyword' | 'semantic'
}) {
	const toolSearchConfig: ToolSearchConfig | undefined = args.sourceParams.toolSearch
		? {
				enabled: true,
				mode: args.sourceParams.toolSearchMode ?? args.definitionToolSearchMode ?? 'keyword',
				hints: args.sourceParams.toolSearchHints ?? 'none',
			}
		: undefined

	const subagentConfig: SubagentConfig | undefined = args.sourceParams.subagentsEnabled
		? {
				enabled: true,
				maxDepth: args.sourceParams.subagentMaxDepth ?? 1,
			}
		: undefined

	return { toolSearchConfig, subagentConfig }
}

function resolveTaskToolDefinitions(task: TaskScenario, trialId: string): ResolvedToolDef[] {
	const migratedRefs = (task.toolRefs ?? []).map((ref) => {
		if (ref.type) {
			return ref as TaskToolRef
		}
		return {
			type: 'tool' as const,
			toolDefinitionId: ref.toolDefinitionId!,
		}
	})

	const { tools, warnings } = resolveTaskTools(migratedRefs)
	if (warnings.length > 0) {
		console.warn(`[runner] Tool resolution warnings for trial ${trialId}:`, warnings)
	}
	return tools
}

export async function runTaskTrial(args: {
	runId: string
	trialId: string
	agentConfigId: string
	scenarioId: string
	maxSteps: number
	maxSimulatedTurns: number
	scenarioType: 'task'
	task: TaskScenario
	agentConfig: HarnessConfig
	sourceParams: AgentConfigParams
	definitionToolSearchMode: 'keyword' | 'semantic'
	variantId?: string
}) {
	const mergedPersistence = mergeTaskPersistence(args.task, args.trialId)
	const resolvedSkills = resolveSkills(args.task, args.trialId)
	const { toolSearchConfig, subagentConfig } = buildTaskRuntimeOptions({
		sourceParams: args.sourceParams,
		definitionToolSearchMode: args.definitionToolSearchMode,
	})

	const prompts = args.task.taskPrompts
	const useMultiTurn = prompts.length > 1 || args.task.simulateWithLlm

	let harnessResult: HarnessResult

	if (useMultiTurn) {
		harnessResult = await runMultiTurnTask({
			config: args.agentConfig,
			prompts,
			simulateWithLlm: args.task.simulateWithLlm ?? false,
			simulationInstructions: args.task.simulationInstructions,
			goalConditions: args.task.goalConditions,
			resolvedTools: resolveTaskToolDefinitions(args.task, args.trialId),
			maxSteps: args.maxSteps,
			maxSimulatedTurns: args.maxSimulatedTurns,
			systemPrompt: args.task.systemPrompt,
			toolSearchConfig,
			subagentConfig,
			initialPersistence: mergedPersistence.length > 0 ? mergedPersistence : undefined,
			resolvedSkills: resolvedSkills.length > 0 ? resolvedSkills : undefined,
		})
	} else if (args.task.toolRefs && args.task.toolRefs.length > 0) {
		harnessResult = await runAgentWithResolvedTools(
			args.agentConfig,
			prompts[0],
			resolveTaskToolDefinitions(args.task, args.trialId),
			args.maxSteps,
			args.task.systemPrompt ?? undefined,
			toolSearchConfig,
			subagentConfig,
			mergedPersistence.length > 0 ? mergedPersistence : undefined,
			resolvedSkills.length > 0 ? resolvedSkills : undefined,
		)
	} else {
		harnessResult = await runAgentWithTools(
			args.agentConfig,
			prompts[0],
			args.task.toolDefinitions ?? [],
			args.maxSteps,
			args.task.systemPrompt ?? undefined,
		)
	}

	const trialData = extractTrialData(harnessResult, {
		trialId: args.trialId,
		runId: args.runId,
		agentConfig: args.agentConfig,
		sourceParams: args.sourceParams,
		scenarioType: args.scenarioType,
		scenarioId: args.scenarioId,
		userPrompt: prompts[0],
		systemPrompt: harnessResult.effectiveSystemPrompt ?? args.task.systemPrompt ?? undefined,
	})

	saveTrial(args.runId, args.trialId, trialData)
	appendTrialSummary(
		args.runId,
		createTrialSummary(
			args.trialId,
			args.agentConfigId,
			harnessResult,
			'completed',
			null,
			args.variantId,
		),
	)
}
