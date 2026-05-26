import { Box, Breadcrumb, Editable, HStack, Heading, Separator, Text } from '@chakra-ui/react'
import { Fragment, type ReactNode } from 'react'

export interface BreadcrumbItem {
	label: string
	onClick: () => void
}

interface PageHeaderProps {
	title: string
	onTitleChange?: (value: string) => void
	description?: string
	breadcrumbs?: BreadcrumbItem[]
	actions?: ReactNode
	inlineStatus?: ReactNode
	trailingAction?: ReactNode
}

export default function PageHeader({
	title,
	onTitleChange,
	description,
	breadcrumbs,
	actions,
	inlineStatus,
	trailingAction,
}: PageHeaderProps) {
	const visibleBreadcrumbs = breadcrumbs?.filter((crumb) => crumb.label) ?? []

	return (
		<Box>
			{visibleBreadcrumbs.length > 0 && (
				<Breadcrumb.Root size="sm" variant="plain" mb={2}>
					<Breadcrumb.List>
						{visibleBreadcrumbs.map((crumb, index) => (
							<Fragment key={crumb.label}>
								<Breadcrumb.Item>
									<Breadcrumb.Link
										as="button"
										type="button"
										onClick={crumb.onClick}
										color="fg.muted"
										_hover={{ color: 'fg', textDecoration: 'none' }}
									>
										{crumb.label}
									</Breadcrumb.Link>
								</Breadcrumb.Item>
								{index < visibleBreadcrumbs.length - 1 && (
									<Breadcrumb.Separator color="fg.subtle" />
								)}
							</Fragment>
						))}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			)}
			<HStack justify="space-between" align="start">
				<Box>
					<HStack gap={3} align="baseline">
						{onTitleChange ? (
							<Editable.Root
								value={title}
								onValueChange={(e) => onTitleChange?.(e.value)}
								fontSize="2xl"
								fontWeight="bold"
								lineHeight="1.2"
							>
								<Editable.Preview px={1} _hover={{ bg: 'bg.subtle' }} cursor="text" />
								<Editable.Input px={1} />
							</Editable.Root>
						) : (
							<Heading size="lg">{title}</Heading>
						)}
						{inlineStatus}
					</HStack>
					{description && (
						<Text color="fg.muted" fontSize="sm" mt={1}>
							{description}
						</Text>
					)}
				</Box>
				{(actions || trailingAction) && (
					<HStack gap={2} flexShrink={0}>
						{actions}
						{actions && trailingAction && (
							<Separator orientation="vertical" height="5" borderColor="border.muted" ml={6} />
						)}
						{trailingAction}
					</HStack>
				)}
			</HStack>
		</Box>
	)
}
