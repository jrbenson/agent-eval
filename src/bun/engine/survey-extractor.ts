// Survey answer extraction — deterministic parsing of LLM responses into typed values.
// Pure functions, no side effects, no persistence writes.

import type {
	ExtractedAnswer,
	ExtractionConfidence,
} from '../../shared/schemas/survey-extraction.schema'

interface QuestionDef {
	id: string
	text: string
	responseFormat: 'free_text' | 'likert' | 'multiple_choice' | 'ranking'
	options?: string[] | null
}

interface QuestionResponse {
	questionId: string
	questionText: string
	responseText: string
}

// ---- Likert Extraction ----

const LIKERT_KEYWORDS: [string, number][] = [
	['strongly disagree', 1],
	['strongly agree', 5],
	['disagree', 2],
	['neutral', 3],
	['agree', 4],
]

function extractLikert(raw: string): {
	value: number | null
	confidence: ExtractionConfidence
} {
	// 1. Look for isolated digit 1-5
	const digitMatch = raw.match(/\b([1-5])\b/)
	if (digitMatch) {
		return { value: Number(digitMatch[1]), confidence: 'exact' }
	}

	// 2. Keyword matching (case-insensitive)
	const lower = raw.toLowerCase()
	for (const [keyword, value] of LIKERT_KEYWORDS) {
		if (lower.includes(keyword)) {
			return { value, confidence: 'inferred' }
		}
	}

	return { value: null, confidence: 'failed' }
}

// ---- Multiple Choice Extraction ----

function extractMultipleChoice(
	raw: string,
	options: string[],
): {
	value: string | null
	index: number | null
	confidence: ExtractionConfidence
} {
	const trimmed = raw.trim()

	// 1. Leading number indicating option index
	const numMatch = trimmed.match(/^\s*(\d+)/)
	if (numMatch) {
		const idx = Number(numMatch[1]) - 1 // 1-based in prompt → 0-based
		if (idx >= 0 && idx < options.length) {
			return { value: options[idx], index: idx, confidence: 'exact' }
		}
	}

	// 2. Exact label match (case-insensitive)
	const lowerTrimmed = trimmed.toLowerCase()
	for (let i = 0; i < options.length; i++) {
		if (lowerTrimmed === options[i].toLowerCase()) {
			return { value: options[i], index: i, confidence: 'exact' }
		}
	}

	// 3. Substring match — response contains exactly one option
	const lowerRaw = raw.toLowerCase()
	const matches: number[] = []
	for (let i = 0; i < options.length; i++) {
		if (lowerRaw.includes(options[i].toLowerCase())) {
			matches.push(i)
		}
	}
	if (matches.length === 1) {
		const idx = matches[0]
		return { value: options[idx], index: idx, confidence: 'inferred' }
	}

	return { value: null, index: null, confidence: 'failed' }
}

// ---- Ranking Extraction ----

function extractRanking(
	raw: string,
	options: string[],
): {
	value: string[] | null
	indices: number[] | null
	confidence: ExtractionConfidence
	matchedCount: number
} {
	// 1. Parse numbered list items
	const linePattern = /^\s*(\d+)[\.\)\:\-]\s*(.+)/gm
	const items: string[] = []
	let match: RegExpExecArray | null
	while ((match = linePattern.exec(raw)) !== null) {
		items.push(match[2].trim())
	}

	if (items.length === 0) {
		return { value: null, indices: null, confidence: 'failed', matchedCount: 0 }
	}

	// 2. Match extracted items to known options (case-insensitive, trimmed)
	const resolvedValues: string[] = []
	const resolvedIndices: number[] = []
	const usedIndices = new Set<number>()

	for (const item of items) {
		const lowerItem = item.toLowerCase()
		let bestIdx = -1
		let bestScore = Number.POSITIVE_INFINITY

		for (let i = 0; i < options.length; i++) {
			if (usedIndices.has(i)) continue
			const lowerOpt = options[i].toLowerCase()

			// Exact match
			if (lowerItem === lowerOpt) {
				bestIdx = i
				bestScore = 0
				break
			}

			// Substring containment (either direction)
			if (lowerItem.includes(lowerOpt) || lowerOpt.includes(lowerItem)) {
				const score = Math.abs(lowerItem.length - lowerOpt.length)
				if (score < bestScore) {
					bestIdx = i
					bestScore = score
				}
			}
		}

		if (bestIdx >= 0 && bestScore <= 20) {
			resolvedValues.push(options[bestIdx])
			resolvedIndices.push(bestIdx)
			usedIndices.add(bestIdx)
		}
	}

	const matchedCount = resolvedValues.length
	const totalOptions = options.length

	if (matchedCount === totalOptions) {
		return {
			value: resolvedValues,
			indices: resolvedIndices,
			confidence: 'exact',
			matchedCount,
		}
	}

	if (matchedCount > 0) {
		return {
			value: resolvedValues,
			indices: resolvedIndices,
			confidence: 'partial',
			matchedCount,
		}
	}

	return { value: null, indices: null, confidence: 'failed', matchedCount: 0 }
}

// ---- Free Text Extraction ----

function normalizeFreeTextValue(value: string): string {
	return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function extractFreeText(raw: string): {
	value: string
	confidence: ExtractionConfidence
} {
	const trimmed = raw.trim()
	if (!trimmed) {
		return { value: '', confidence: 'failed' }
	}

	// Split on first pipe character
	const pipeIdx = trimmed.indexOf('|')
	if (pipeIdx > 0) {
		const left = trimmed.slice(0, pipeIdx)
		const normalized = normalizeFreeTextValue(left)
		if (normalized) {
			return { value: normalized, confidence: 'exact' }
		}
	}

	// Fallback: use first line, normalized
	const firstLine = trimmed.split(/\r?\n/)[0]
	const normalized = normalizeFreeTextValue(firstLine)
	return { value: normalized || trimmed, confidence: 'inferred' }
}

// ---- Main Extraction Function ----

export function extractSurveyAnswers(
	questionResponses: QuestionResponse[],
	questions: QuestionDef[],
): ExtractedAnswer[] {
	const questionMap = new Map(questions.map((q) => [q.id, q]))

	return questionResponses.map((qr) => {
		const qDef = questionMap.get(qr.questionId)
		const format = (qDef?.responseFormat ?? 'free_text') as ExtractedAnswer['responseFormat']
		const raw = qr.responseText

		const base = {
			questionId: qr.questionId,
			questionText: qr.questionText,
			responseFormat: format,
			raw,
		}

		switch (format) {
			case 'likert': {
				const result = extractLikert(raw)
				return {
					...base,
					confidence: result.confidence,
					likertValue: result.value,
				}
			}

			case 'multiple_choice': {
				const opts = qDef?.options ?? []
				const result = extractMultipleChoice(raw, opts)
				return {
					...base,
					confidence: result.confidence,
					choiceValue: result.value,
					choiceIndex: result.index,
				}
			}

			case 'ranking': {
				const opts = qDef?.options ?? []
				const result = extractRanking(raw, opts)
				return {
					...base,
					confidence: result.confidence,
					rankingValue: result.value,
					rankingIndices: result.indices,
				}
			}
			default: {
				const result = extractFreeText(raw)
				return {
					...base,
					confidence: result.confidence,
					freeTextValue: result.value,
				}
			}
		}
	})
}
