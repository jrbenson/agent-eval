// ---- Trial Data Types ----
// Scenario-agnostic format for storing trial execution data.
// All analysis (goal evaluation, scoring, survey attribution) is computed on demand.

export interface TrialMessage {
	role: 'system' | 'user' | 'assistant' | 'tool'
	content: string | null
	toolCalls?: {
		id: string
		name: string
		input: Record<string, unknown>
	}[]
	toolResultFor?: string
	toolName?: string
	usage?: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
	finishReason?: string
	latencyMs?: number
}

export interface TrialStep {
	stepIndex: number
	messageIndices: number[]
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
	finishReason: string
	latencyMs: number
	reasoning?: string | null
}

export interface ToolValidation {
	toolCallId: string
	toolName: string
	validatedInput: Record<string, unknown> | null
	validationPassed: boolean
	validationErrors: string[]
	durationMs: number
	subagentTrace?: SubagentTrace
}

export interface SubagentTrace {
	task: string
	depth: number
	systemPrompt?: string | null
	steps: TrialStep[]
	messages: TrialMessage[]
	toolValidations?: ToolValidation[]
	tokens: { total: number; prompt: number; completion: number }
	latencyMs: number
	finishReason: string
	responseText: string
}

export interface UtilityLlmCall {
	purpose: 'toolMock' | 'simulation'
	toolCallId?: string
	toolName?: string
	systemPrompt?: string | null
	userPrompt?: string | null
	assistantResponse?: string | null
	inputTokens: number
	outputTokens: number
	latencyMs: number
	messages?: TrialMessage[]
	steps?: TrialStep[]
}

export interface TrialData {
	trialId: string
	runId: string
	agent: {
		provider: string
		model: string
		temperature: number
		maxTokens?: number
		topP?: number
		reasoning?: string
		toolSearch?: boolean
		toolSearchMode?: string
		toolSearchHints?: string
		subagentsEnabled?: boolean
		subagentMaxDepth?: number
	}
	scenarioType: 'survey' | 'task'
	scenarioId: string
	messages: TrialMessage[]
	steps: TrialStep[]
	toolValidations?: ToolValidation[]
	metrics: {
		totalTokens: number
		promptTokens: number
		completionTokens: number
		totalLatencyMs: number
		stepCount: number
		finishReason: string
	}
	status: 'completed' | 'failed'
	error?: string
	createdAt: string
	utilityLlmCalls?: UtilityLlmCall[]
	persistenceSnapshot?: Array<{ name: string; content: string }>
	/** For survey trials: the realized question ordering (index into original questions array) */
	questionOrder?: number[]
}

export interface TrialSummary {
	trialId: string
	agentConfigId: string
	variantId?: string
	status: 'completed' | 'failed'
	stepCount: number
	totalTokens: number
	promptTokens: number
	completionTokens: number
	latencyMs: number
	finishReason: string
	error: string | null
	createdAt: string
}
