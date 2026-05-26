import { VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import type { StoredContentSet } from '../../shared/schemas/content-set.schema'
import type { StoredContent } from '../../shared/schemas/content.schema'
import type { StoredSkillSet } from '../../shared/schemas/skill-set.schema'
import type { StoredSkill } from '../../shared/schemas/skill.schema'
import type {
	GoalCondition,
	TaskContentRef,
	TaskSkillRef,
	TaskToolRef,
	TaskVariantOverrides,
} from '../../shared/schemas/task.schema'
import type { StoredToolDefinition } from '../../shared/schemas/tool-definition.schema'
import type { StoredToolSet } from '../../shared/schemas/tool-set.schema'
import {
	AgentSettingsSection,
	ContentSection,
	type GoalConditionForm,
	GoalConditionsSection,
	SkillsSection,
	TaskPromptsSection,
	ToolRefsSection,
} from '../components/TaskSections'
import { OverrideToggle, VariantSectionWrapper } from '../components/VariantSectionWrapper'

// Section keys matching the overridable properties
type SectionKey =
	| 'taskPrompts'
	| 'systemPrompt'
	| 'goalConditions'
	| 'toolRefs'
	| 'contentRefs'
	| 'skillRefs'

interface PrimaryState {
	taskPrompts: string[]
	systemPrompt: string
	simulateWithLlm: boolean
	simulationInstructions: string
	toolRefs: TaskToolRef[]
	contentRefs: TaskContentRef[]
	skillRefs: TaskSkillRef[]
	inlineSkills: Array<{ name: string; description: string; content: string }>
	goalConditions: GoalConditionForm[]
	initialPersistence: Array<{ name: string; content: string }>
}

interface VariantEditorProps {
	overrides: TaskVariantOverrides
	onChange: (overrides: TaskVariantOverrides) => void
	primary: PrimaryState
	// Data dependencies for pickers
	allToolDefs: StoredToolDefinition[] | undefined
	allToolSets: StoredToolSet[] | undefined
	allContents: StoredContent[] | undefined
	allContentSets: StoredContentSet[] | undefined
	allSkills: StoredSkill[] | undefined
	allSkillSets: StoredSkillSet[] | undefined
	goalConditionToForm: (condition: GoalCondition) => GoalConditionForm
}

export function VariantEditor({
	overrides,
	onChange,
	primary,
	allToolDefs,
	allToolSets,
	allContents,
	allContentSets,
	allSkills,
	allSkillSets,
	goalConditionToForm,
}: VariantEditorProps) {
	const isEnabled = (key: SectionKey) => overrides[key] !== undefined

	const enableSection = useCallback(
		(key: SectionKey) => {
			// Copy from primary when enabling
			switch (key) {
				case 'taskPrompts':
					onChange({
						...overrides,
						taskPrompts: [...primary.taskPrompts],
						simulateWithLlm: primary.simulateWithLlm,
						simulationInstructions: primary.simulationInstructions || undefined,
					})
					break
				case 'systemPrompt':
					onChange({
						...overrides,
						systemPrompt: primary.systemPrompt ?? '',
					})
					break
				case 'goalConditions':
					// We'll need to convert forms back to conditions — store empty array if no conditions
					onChange({ ...overrides, goalConditions: [] })
					break
				case 'toolRefs':
					onChange({ ...overrides, toolRefs: [...primary.toolRefs] })
					break
				case 'contentRefs':
					onChange({
						...overrides,
						contentRefs: [...primary.contentRefs],
						initialPersistence: [...primary.initialPersistence],
					})
					break
				case 'skillRefs':
					onChange({
						...overrides,
						skillRefs: [...primary.skillRefs],
						inlineSkills: [...primary.inlineSkills],
					})
					break
			}
		},
		[overrides, onChange, primary],
	)

	const disableSection = useCallback(
		(key: SectionKey) => {
			const next = { ...overrides }
			switch (key) {
				case 'taskPrompts':
					next.taskPrompts = undefined
					next.simulateWithLlm = undefined
					next.simulationInstructions = undefined
					break
				case 'systemPrompt':
					next.systemPrompt = undefined
					break
				case 'goalConditions':
					next.goalConditions = undefined
					break
				case 'toolRefs':
					next.toolRefs = undefined
					break
				case 'contentRefs':
					next.contentRefs = undefined
					next.initialPersistence = undefined
					break
				case 'skillRefs':
					next.skillRefs = undefined
					next.inlineSkills = undefined
					break
			}
			onChange(next)
		},
		[overrides, onChange],
	)

	const toggleSection = useCallback(
		(key: SectionKey, enabled: boolean) => {
			if (enabled) enableSection(key)
			else disableSection(key)
		},
		[enableSection, disableSection],
	)

	// Track goal conditions in form format for the variant
	// We store GoalCondition[] in overrides but display as forms
	const variantGoalForms: GoalConditionForm[] = overrides.goalConditions
		? overrides.goalConditions.map(goalConditionToForm)
		: []

	const overrideToggle = (key: SectionKey) => (
		<OverrideToggle
			enabled={isEnabled(key)}
			onToggle={(e) => toggleSection(key, e)}
			onReset={() => enableSection(key)}
		/>
	)

	return (
		<VStack gap={10} align="stretch">
			{/* Task Prompts */}
			{isEnabled('taskPrompts') ? (
				<TaskPromptsSection
					taskPrompts={overrides.taskPrompts ?? primary.taskPrompts}
					setTaskPrompts={(prompts) => onChange({ ...overrides, taskPrompts: prompts })}
					simulateWithLlm={overrides.simulateWithLlm ?? primary.simulateWithLlm}
					setSimulateWithLlm={(val) => onChange({ ...overrides, simulateWithLlm: val })}
					simulationInstructions={
						overrides.simulationInstructions ?? primary.simulationInstructions
					}
					setSimulationInstructions={(val) =>
						onChange({ ...overrides, simulationInstructions: val || undefined })
					}
					headerTrailing={overrideToggle('taskPrompts')}
				/>
			) : (
				<VariantSectionWrapper
					title="Task Prompts"
					description="Listed prompts are sent to agent in order."
					trailing={overrideToggle('taskPrompts')}
				/>
			)}

			{/* Agent Settings */}
			{isEnabled('systemPrompt') ? (
				<AgentSettingsSection
					systemPrompt={overrides.systemPrompt ?? primary.systemPrompt}
					setSystemPrompt={(val) => onChange({ ...overrides, systemPrompt: val || undefined })}
					headerTrailing={overrideToggle('systemPrompt')}
				/>
			) : (
				<VariantSectionWrapper
					title="Agent Settings"
					description="Configure the baseline agent behavior."
					trailing={overrideToggle('systemPrompt')}
				/>
			)}

			{/* Goal Conditions */}
			{isEnabled('goalConditions') ? (
				<GoalConditionsSection
					goalConditions={variantGoalForms}
					setGoalConditions={() => {}}
					updateGoalCondition={() => {}}
					headerTrailing={overrideToggle('goalConditions')}
				/>
			) : (
				<VariantSectionWrapper
					title="Goal Conditions"
					description="All conditions must pass for the task to count as successful."
					trailing={overrideToggle('goalConditions')}
				/>
			)}

			{/* Tools */}
			{isEnabled('toolRefs') ? (
				<ToolRefsSection
					toolRefs={overrides.toolRefs ?? primary.toolRefs}
					setToolRefs={(refs) => onChange({ ...overrides, toolRefs: refs })}
					allToolDefs={allToolDefs}
					allToolSets={allToolSets}
					headerTrailing={overrideToggle('toolRefs')}
				/>
			) : (
				<VariantSectionWrapper
					title="Tools"
					description="Mock or LLM-backed tools the agent can call."
					trailing={overrideToggle('toolRefs')}
				/>
			)}

			{/* Content */}
			{isEnabled('contentRefs') ? (
				<ContentSection
					contentRefs={overrides.contentRefs ?? primary.contentRefs}
					setContentRefs={(refs) => onChange({ ...overrides, contentRefs: refs })}
					initialPersistence={overrides.initialPersistence ?? primary.initialPersistence}
					setInitialPersistence={(entries) =>
						onChange({ ...overrides, initialPersistence: entries })
					}
					allContents={allContents}
					allContentSets={allContentSets}
					headerTrailing={overrideToggle('contentRefs')}
				/>
			) : (
				<VariantSectionWrapper
					title="Content"
					description="Reusable key-value data merged into persistence."
					trailing={overrideToggle('contentRefs')}
				/>
			)}

			{/* Skills */}
			{isEnabled('skillRefs') ? (
				<SkillsSection
					skillRefs={overrides.skillRefs ?? primary.skillRefs}
					setSkillRefs={(refs) => onChange({ ...overrides, skillRefs: refs })}
					inlineSkills={overrides.inlineSkills ?? primary.inlineSkills}
					setInlineSkills={(skills) => onChange({ ...overrides, inlineSkills: skills })}
					allSkills={allSkills}
					allSkillSets={allSkillSets}
					headerTrailing={overrideToggle('skillRefs')}
				/>
			) : (
				<VariantSectionWrapper
					title="Skills"
					description="Progressive-disclosure instructions loaded on demand."
					trailing={overrideToggle('skillRefs')}
				/>
			)}
		</VStack>
	)
}
