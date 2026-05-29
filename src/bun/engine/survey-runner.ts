import { type HarnessConfig, generateSimpleText } from './harness'
import { getQuestionOrdering } from './latin-square'

export interface SurveyQuestion {
	id: string
	text: string
	responseFormat: string
	options?: string[] | null
}

export interface SurveyRunConfig {
	surveyId: string
	questions: SurveyQuestion[]
	orderingStrategy: 'fixed' | 'randomized' | 'latin_square'
	systemPrompt?: string | null
	agentConfig: HarnessConfig
	trialId: string
	runIndex: number
}

export interface SurveyRunResult {
	responseText: string
	totalTokens: number
	promptTokens: number
	completionTokens: number
	latencyMs: number
	questionOrder: number[]
	questionResponses: {
		questionId: string
		questionText: string
		questionOrder: number
		responseText: string
		latencyMs: number
		tokenCount: number
	}[]
}

function formatQuestionPrompt(q: SurveyQuestion): string {
	let prompt = q.text

	switch (q.responseFormat) {
		case 'likert':
			prompt +=
				'\n\nRespond with a number from 1–5 on the Likert scale. You may add a brief explanation after a | character.\n\nScale:\n1 – Strongly Disagree\n2 – Disagree\n3 – Neutral\n4 – Agree\n5 – Strongly Agree\n\nFormat:\n[1-5] | [explanation]'
			break
		case 'multiple_choice':
			if (q.options && q.options.length > 0) {
				prompt += `\n\nChoose one of the following options. Respond with the option number. You may add a brief explanation after a | character.\n\nFormat:\n[option #] | [explanation]\n\nOptions:\n${q.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
			}
			break
		case 'ranking':
			if (q.options && q.options.length > 0) {
				prompt += `\n\nRank these items from most to least preferred. Respond with a numbered list, one item per line. You may add a brief explanation after a | character.\n\nFormat:\n1. [option] | [explanation]\n2. [option] | [explanation]\n\nItems to rank:\n${q.options.map((o) => `- ${o}`).join('\n')}`
			}
			break
		case 'free_text':
			prompt += '\n\nRespond with your answer in this format: [your answer] | [your explanation]'
			break
		// free_text: no additional instructions
	}

	return prompt
}

export async function runSurvey(config: SurveyRunConfig): Promise<SurveyRunResult> {
	const ordering = getQuestionOrdering(
		config.questions.length,
		config.orderingStrategy,
		config.runIndex,
	)

	const orderedQuestions = ordering.map((i) => config.questions[i])

	const questionResponses: SurveyRunResult['questionResponses'] = []
	let totalTokens = 0
	let promptTokens = 0
	let completionTokens = 0
	let totalLatency = 0
	const allResponses: string[] = []

	// Each question is an independent prompt
	for (let i = 0; i < orderedQuestions.length; i++) {
		const q = orderedQuestions[i]
		const prompt = formatQuestionPrompt(q)

		const result = await generateSimpleText(
			config.agentConfig,
			prompt,
			config.systemPrompt ?? undefined,
		)

		questionResponses.push({
			questionId: q.id,
			questionText: q.text,
			questionOrder: i,
			responseText: result.responseText,
			latencyMs: result.latencyMs,
			tokenCount: result.totalTokens,
		})

		totalTokens += result.totalTokens
		promptTokens += result.promptTokens
		completionTokens += result.completionTokens
		totalLatency += result.latencyMs
		allResponses.push(`Q${i + 1}: ${q.text}\nA: ${result.responseText}`)
	}

	return {
		responseText: allResponses.join('\n\n'),
		totalTokens,
		promptTokens,
		completionTokens,
		latencyMs: totalLatency,
		questionOrder: ordering,
		questionResponses,
	}
}
