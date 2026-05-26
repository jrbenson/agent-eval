import type { UtilityLlmCall } from '../mock-runtime'
import type { HarnessConfig } from '../provider-registry'
import type { TelemetryCollector } from '../telemetry'
import type { ToolCatalog } from './tool-catalog'

export interface ExecutionContext {
	config: HarnessConfig
	systemPrompt?: string
	telemetry: TelemetryCollector
	currentDepth: number
	maxDepth: number
	maxSteps: number
	toolCatalog: ToolCatalog
	toolMockCache: Map<string, unknown>
	utilityLlmCalls: UtilityLlmCall[]
	mockPersistence: Map<string, string>
}
