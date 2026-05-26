import type { AgentConfigParams } from '../../../shared/rpc-types'
import type { TrialData, TrialSummary } from '../../../shared/schemas/trial.schema'
import { appendTrialSummary, saveTrial } from '../../data/runs'
import type { HarnessConfig } from '../harness'
import { type SurveyQuestion, type SurveyRunResult, runSurvey } from '../survey-runner'

function buildSurveyTrialData(
	result: SurveyRunResult,
	context: {
		trialId: string
		runId: string
		agentConfig: HarnessConfig
		sourceParams?: AgentConfigParams
		scenarioId: string
	},
): TrialData {
	const messages: TrialData['messages'] = []
	for (const response of result.questionResponses) {
		messages.push({
			role: 'user',
			content: response.questionText,
		})
		messages.push({
			role: 'assistant',
			content: response.responseText,
			latencyMs: response.latencyMs,
			usage: {
				promptTokens: 0,
				completionTokens: response.tokenCount,
				totalTokens: response.tokenCount,
			},
		})
	}

	return {
		trialId: context.trialId,
		runId: context.runId,
		agent: {
			provider: context.agentConfig.provider,
			model: context.agentConfig.model,
			temperature: context.agentConfig.temperature,
			maxTokens: context.agentConfig.maxTokens,
			topP: context.agentConfig.topP,
			reasoning: context.sourceParams?.reasoning,
			toolSearch: context.sourceParams?.toolSearch,
			toolSearchMode: context.sourceParams?.toolSearchMode,
			toolSearchHints: context.sourceParams?.toolSearchHints,
			subagentsEnabled: context.sourceParams?.subagentsEnabled,
			subagentMaxDepth: context.sourceParams?.subagentMaxDepth,
		},
		scenarioType: 'survey',
		scenarioId: context.scenarioId,
		messages,
		steps: [],
		metrics: {
			totalTokens: result.totalTokens,
			promptTokens: result.promptTokens,
			completionTokens: result.completionTokens,
			totalLatencyMs: result.latencyMs,
			stepCount: result.questionResponses.length,
			finishReason: 'stop',
		},
		status: 'completed',
		createdAt: new Date().toISOString(),
		questionOrder: result.questionOrder,
	}
}

export async function runSurveyTrial(args: {
	runId: string
	trialId: string
	agentConfigId: string
	runIndex: number
	scenarioId: string
	survey: {
		questions: SurveyQuestion[]
		orderingStrategy: string
		systemPrompt?: string
	}
	agentConfig: HarnessConfig
	sourceParams: AgentConfigParams
}) {
	const surveyResult = await runSurvey({
		surveyId: args.scenarioId,
		questions: args.survey.questions,
		orderingStrategy: args.survey.orderingStrategy as 'fixed' | 'randomized' | 'latin_square',
		systemPrompt: args.survey.systemPrompt,
		agentConfig: args.agentConfig,
		trialId: args.trialId,
		runIndex: args.runIndex,
	})

	const trialData = buildSurveyTrialData(surveyResult, {
		trialId: args.trialId,
		runId: args.runId,
		agentConfig: args.agentConfig,
		sourceParams: args.sourceParams,
		scenarioId: args.scenarioId,
	})

	saveTrial(args.runId, args.trialId, trialData)

	const summary: TrialSummary = {
		trialId: args.trialId,
		agentConfigId: args.agentConfigId,
		status: 'completed',
		stepCount: surveyResult.questionResponses.length,
		totalTokens: surveyResult.totalTokens,
		promptTokens: surveyResult.promptTokens,
		completionTokens: surveyResult.completionTokens,
		latencyMs: surveyResult.latencyMs,
		finishReason: 'stop',
		error: null,
		createdAt: new Date().toISOString(),
	}

	appendTrialSummary(args.runId, summary)
}
