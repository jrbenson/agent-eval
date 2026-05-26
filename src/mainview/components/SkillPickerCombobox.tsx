import { Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { StoredSkillSet } from '../../shared/schemas/skill-set.schema'
import type { StoredSkill } from '../../shared/schemas/skill.schema'
import EntityPickerCombobox from './EntityPickerCombobox'

interface SkillItem {
	label: string
	value: string
	name: string
}

interface SkillPickerComboboxProps {
	skills: StoredSkill[]
	excludeIds: Set<string>
	onSelect: (id: string) => void
	placeholder?: string
}

export function SkillPickerCombobox({
	skills,
	excludeIds,
	onSelect,
	placeholder = 'Search skills...',
}: SkillPickerComboboxProps) {
	const items = useMemo<SkillItem[]>(
		() =>
			skills
				.filter((s) => !excludeIds.has(s.id))
				.map((s) => ({
					label: s.label,
					value: s.id,
					name: s.name,
				})),
		[skills, excludeIds],
	)

	if (items.length === 0) return null

	return (
		<EntityPickerCombobox
			emptyMessage="No skills found"
			items={items}
			itemToString={(item) => `${item.label} ${item.name}`}
			onSelect={onSelect}
			placeholder={placeholder}
			renderItem={(item) => (
				<VStack gap={0} align="start" flex={1}>
					<Text fontSize="sm">{item.label}</Text>
					<Text fontSize="xs" color="fg.muted" fontFamily="mono">
						{item.name}
					</Text>
				</VStack>
			)}
		/>
	)
}

interface SkillSetPickerComboboxProps {
	skillSets: StoredSkillSet[]
	excludeIds: Set<string>
	onSelect: (id: string) => void
	placeholder?: string
}

export function SkillSetPickerCombobox({
	skillSets,
	excludeIds,
	onSelect,
	placeholder = 'Attach a skill set...',
}: SkillSetPickerComboboxProps) {
	const items = useMemo(
		() =>
			skillSets
				.filter((ss) => !excludeIds.has(ss.id))
				.map((ss) => ({
					label: ss.label,
					value: ss.id,
					count: ss.skillRefs.length,
				})),
		[skillSets, excludeIds],
	)

	if (items.length === 0) return null

	return (
		<EntityPickerCombobox
			emptyMessage="No skill sets found"
			items={items}
			onSelect={onSelect}
			placeholder={placeholder}
			renderItem={(item) => (
				<VStack gap={0} align="start" flex={1}>
					<Text fontSize="sm">{item.label}</Text>
					<Text fontSize="xs" color="fg.muted">
						{item.count} skill{item.count !== 1 ? 's' : ''}
					</Text>
				</VStack>
			)}
		/>
	)
}
