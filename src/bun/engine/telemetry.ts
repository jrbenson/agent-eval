/**
 * Telemetry collector for tool calls during an eval run.
 * Captures timing, inputs, outputs, validation outcomes.
 */
export interface ToolCallTelemetry {
	toolCallId: string
	toolName: string
	input: unknown
	validatedInput: unknown
	output: unknown
	durationMs: number
	validationPassed: boolean
	validationErrors: string[] | null
	error: string | null
}

export class TelemetryCollector {
	private toolCalls: ToolCallTelemetry[] = []
	private startTime = 0

	start() {
		this.startTime = Date.now()
		this.toolCalls = []
	}

	recordToolCall(call: ToolCallTelemetry) {
		this.toolCalls.push(call)
	}

	getToolCalls(): ToolCallTelemetry[] {
		return [...this.toolCalls]
	}

	getElapsedMs(): number {
		return Date.now() - this.startTime
	}
}
