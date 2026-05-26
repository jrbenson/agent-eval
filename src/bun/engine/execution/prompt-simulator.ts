import { generateText } from 'ai'
import type { ModelMessage } from 'ai'
import type { GoalCondition } from '../../../shared/schemas/task.schema'
import { getUtilityLlmProfile } from '../../data/settings'
import { getUtilityModel } from '../provider-registry'

import type { UtilityLlmCall } from '../mock-runtime'

const SIMULATION_SYSTEM_PROMPT = `You are role-playing as a human user chatting with an AI assistant. Write the NEXT message the user would send.

Critical rules:
- You ARE the user. Respond from the user's perspective in first person.
- If the assistant asked you a question, ANSWER it with a plausible made-up detail (e.g. a city name, a preference, a number). Do NOT echo the question back.
- The user does NOT know internal tool names, API schemas, or system internals.
- Keep messages short and natural — 1-2 sentences, like a real chat.
- Do not repeat what you already said. Advance the conversation toward your goals.
- If the assistant completed part of the task, acknowledge it briefly and move to the next goal.
- ONLY output [SATISFIED] if the assistant has ACTUALLY fulfilled all your remaining objectives listed below. Do NOT output [SATISFIED] if the assistant merely asked a question or offered to help.

Output ONLY the user's next message text. No quotes, no labels, no explanation.`

function formatGoalForUser(condition: GoalCondition): string {
	switch (condition.type) {
		case 'string_match':
			return `The assistant's response should mention: "${condition.pattern}"`
		case 'regex':
			return 'The assistant should respond with specific information matching a text pattern'
		case 'tool_called': {
			// Convert tool name to a natural user-facing description
			const humanized = condition.toolName
				.replace(/[_-]/g, ' ')
				.replace(/([a-z])([A-Z])/g, '$1 $2')
				.toLowerCase()
			if (condition.inputSubset) {
				const paramHints = Object.entries(condition.inputSubset)
					.map(([k, v]) => `${k}: ${v}`)
					.join(', ')
				return `You want the assistant to ${humanized} (specifically: ${paramHints})`
			}
			return `You want the assistant to ${humanized}`
		}
		case 'schema_match':
			return 'The assistant should provide structured data with specific properties'
		case 'output_subset':
			return 'The assistant should include specific data values in its response'
		default:
			return 'An unspecified condition should be met'
	}
}

function buildSimulationUserPrompt(
	unmetGoals: GoalCondition[],
	simulationInstructions?: string,
): string {
	let prompt = ''
	if (unmetGoals.length > 0) {
		prompt += 'Your remaining objectives (things you still want from this conversation):\n'
		for (const goal of unmetGoals) {
			prompt += `- ${formatGoalForUser(goal)}\n`
		}
	} else {
		prompt +=
			'You have no specific remaining objectives. If the assistant seems to have addressed your needs, respond with [SATISFIED].\n'
	}
	if (simulationInstructions) {
		prompt += `\nContext about who you are and what you want:\n${simulationInstructions}`
	}
	return prompt
}

export const SATISFIED_MARKER = '[SATISFIED]'
export const MAX_SIMULATED_TURNS = 5

export async function generateSimulatedPrompt(
	conversationMessages: ModelMessage[],
	unmetGoals: GoalCondition[],
	simulationInstructions?: string,
	utilityLlmCalls?: UtilityLlmCall[],
): Promise<{ text: string; satisfied: boolean }> {
	const profile = getUtilityLlmProfile('simulation')
	if (!profile) {
		throw new Error('No simulation utility LLM configured. Set one in Settings → Utility LLMs.')
	}

	const model = await getUtilityModel(profile)
	const userPromptContent = buildSimulationUserPrompt(unmetGoals, simulationInstructions)
	const systemContent = `${SIMULATION_SYSTEM_PROMPT}\n\n${userPromptContent}`

	const callStart = Date.now()
	const result = await generateText({
		model,
		system: systemContent,
		messages: conversationMessages,
		temperature: profile.temperature,
		...(profile.maxTokens ? { maxOutputTokens: profile.maxTokens } : {}),
	})
	const latencyMs = Date.now() - callStart

	const text = result.text.trim()
	const inputTokens = result.usage?.inputTokens ?? 0
	const outputTokens = result.usage?.outputTokens ?? 0

	if (utilityLlmCalls) {
		utilityLlmCalls.push({
			purpose: 'simulation',
			systemPrompt: systemContent,
			userPrompt: userPromptContent,
			assistantResponse: text,
			inputTokens,
			outputTokens,
			latencyMs,
		})
	}

	if (text === SATISFIED_MARKER) {
		return { text: '', satisfied: true }
	}
	// Strip marker if it appears alongside other text (LLM sometimes appends it)
	const cleaned = text.replace(SATISFIED_MARKER, '').trim()
	if (!cleaned) {
		return { text: '', satisfied: true }
	}
	return { text: cleaned, satisfied: false }
}
