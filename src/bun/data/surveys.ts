import type { CreateSurveyParams } from '../../shared/rpc-types'
import { surveyPath, surveysDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'

export interface StoredSurvey extends CreateSurveyParams {
	id: string
	createdAt: string
	updatedAt: string
}

const surveyRepository = createEntityRepository<
	CreateSurveyParams,
	StoredSurvey,
	StoredSurvey & { questionCount: number }
>({
	pathForId: surveyPath,
	dirPath: surveysDir,
	createStored(data, meta) {
		return {
			id: meta.id,
			...data,
			createdAt: meta.now,
			updatedAt: meta.now,
		}
	},
	sort: sortByCreatedAtAscending,
	mapListItem(survey) {
		return {
			...survey,
			questionCount: survey.questions?.length ?? 0,
		}
	},
})

export const createSurvey = surveyRepository.create
export const getSurvey = surveyRepository.get
export const listSurveys = surveyRepository.list
export const updateSurvey = surveyRepository.update
export const deleteSurvey = surveyRepository.delete
