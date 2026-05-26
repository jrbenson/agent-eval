import { Box, Button, Flex, HStack, IconButton, Input, Menu, Portal, Text } from '@chakra-ui/react'
import { LuArrowUpDown, LuCheck, LuSearch, LuX } from 'react-icons/lu'
import type { SortOption } from '../hooks/use-list-filter'

interface ListToolbarProps<T> {
	filterText: string
	onFilterChange: (value: string) => void
	sortValue: string
	onSortChange: (value: string) => void
	sortOptions: SortOption<T>[]
	placeholder?: string
	resultCount?: number
	totalCount?: number
	selectAllToggle?: {
		isAllSelected: boolean
		selectAll: () => void
		deselectAll: () => void
	}
}

export default function ListToolbar<T>({
	filterText,
	onFilterChange,
	sortValue,
	onSortChange,
	sortOptions,
	placeholder = 'Filter...',
	resultCount,
	totalCount,
	selectAllToggle,
}: ListToolbarProps<T>) {
	const showCount = filterText && resultCount !== undefined && totalCount !== undefined

	return (
		<HStack gap={2} mb={2}>
			<Box position="relative" flex={1}>
				<Box position="absolute" left={2} top="50%" transform="translateY(-50%)" color="fg.muted">
					<LuSearch size={14} />
				</Box>
				<Input
					size="sm"
					placeholder={placeholder}
					value={filterText}
					onChange={(e) => onFilterChange(e.target.value)}
					pl={8}
					pr={filterText ? 8 : undefined}
				/>
				{filterText && (
					<Box position="absolute" right={1} top="50%" transform="translateY(-50%)">
						<IconButton
							aria-label="Clear filter"
							size="2xs"
							variant="ghost"
							onClick={() => onFilterChange('')}
						>
							<LuX />
						</IconButton>
					</Box>
				)}
			</Box>

			{showCount && (
				<Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
					{resultCount}/{totalCount}
				</Text>
			)}

			{selectAllToggle && (
				<Button
					size="xs"
					variant="ghost"
					onClick={
						selectAllToggle.isAllSelected ? selectAllToggle.deselectAll : selectAllToggle.selectAll
					}
				>
					{selectAllToggle.isAllSelected ? 'Deselect all' : 'Select all'}
				</Button>
			)}

			{sortOptions.length > 1 && (
				<Menu.Root>
					<Menu.Trigger asChild>
						<IconButton size="sm" variant="outline" aria-label="Sort">
							<LuArrowUpDown />
						</IconButton>
					</Menu.Trigger>
					<Portal>
						<Menu.Positioner>
							<Menu.Content>
								{sortOptions.map((opt) => (
									<Menu.Item
										key={opt.value}
										value={opt.value}
										onClick={() => onSortChange(opt.value)}
									>
										<Flex gap={2} align="center" minW="140px">
											<Box w="14px" flexShrink={0}>
												{sortValue === opt.value && <LuCheck size={12} />}
											</Box>
											{opt.label}
										</Flex>
									</Menu.Item>
								))}
							</Menu.Content>
						</Menu.Positioner>
					</Portal>
				</Menu.Root>
			)}
		</HStack>
	)
}
