import { getContentSet } from '../data/content-sets'
import { getContent } from '../data/contents'
import { getEvaluation } from '../data/evaluations'
import { getSkillSet } from '../data/skill-sets'
import { getSkill } from '../data/skills'
import { getSurvey } from '../data/surveys'
import { getTask } from '../data/tasks'
import { getToolSet } from '../data/tool-sets'
import { getToolDefinition } from '../data/tools'

type LabelGetter = (id: string) => { label?: string } | null

const LABEL_GETTERS: Record<string, LabelGetter> = {
	toolDefinition: getToolDefinition,
	toolSet: getToolSet,
	skill: getSkill,
	skillSet: getSkillSet,
	content: getContent,
	contentSet: getContentSet,
	task: getTask,
	survey: getSurvey,
	evaluation: getEvaluation,
}

export function resolveEntityLabel(entityType: string, entityId: string): string {
	const getter = LABEL_GETTERS[entityType]
	if (getter) {
		const entity = getter(entityId)
		if (entity?.label) {
			return entity.label
		}
	}

	const typeName = entityType.replace(/([A-Z])/g, ' $1').trim()
	return `${typeName} ${entityId.slice(0, 8)}`
}
