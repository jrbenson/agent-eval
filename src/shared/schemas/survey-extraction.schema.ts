// Structured answer extraction types for survey responses.
// Extraction is performed on-read (not at run time) so logic can improve over time.

export type ExtractionConfidence = 'exact' | 'inferred' | 'partial' | 'failed'

export interface ExtractedAnswer {
	questionId: string
	questionText: string
	responseFormat: 'free_text' | 'likert' | 'multiple_choice' | 'ranking'
	raw: string
	confidence: ExtractionConfidence
	// Type-specific extracted values (only the relevant set is populated):
	likertValue?: number | null
	choiceValue?: string | null
	choiceIndex?: number | null
	rankingValue?: string[] | null
	rankingIndices?: number[] | null
	freeTextValue?: string
}

export interface SurveyRunExtraction {
	trialId: string
	agentConfigId: string
	answers: ExtractedAnswer[]
}
