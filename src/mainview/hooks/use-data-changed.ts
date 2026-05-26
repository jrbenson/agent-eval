import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

const ENTITY_QUERY_KEYS: Record<string, string[][]> = {
	toolDefinition: [['toolDefinitions'], ['toolDefinition']],
	toolSet: [['toolSets'], ['toolSet']],
	skill: [['skills'], ['skill']],
	skillSet: [['skillSets'], ['skillSet']],
	content: [['contents'], ['content']],
	contentSet: [['contentSets'], ['contentSet']],
	task: [['tasks'], ['task'], ['taskRunAnalysis']],
	survey: [['surveys'], ['survey'], ['surveyRunAnswers']],
	evaluation: [['evaluations'], ['evaluation']],
	result: [
		['runs'],
		['run'],
		['runResults'],
		['runStatus'],
		['surveyRunAnswers'],
		['taskRunAnalysis'],
		['allRunResults'],
		['dashboardStats'],
	],
	agentConfig: [['agentConfigs']],
}

export function useDataChangedListener() {
	const qc = useQueryClient()

	useEffect(() => {
		const handler = (e: Event) => {
			const { entityType } = (e as CustomEvent).detail ?? {}
			const keys = ENTITY_QUERY_KEYS[entityType]
			if (keys) {
				for (const key of keys) {
					// Remove cached data so next mount fetches fresh
					qc.removeQueries({ queryKey: key, type: 'inactive' })
					// Refetch any actively mounted queries
					qc.invalidateQueries({ queryKey: key })
				}
			}
		}
		window.addEventListener('data-changed', handler)
		return () => window.removeEventListener('data-changed', handler)
	}, [qc])
}
