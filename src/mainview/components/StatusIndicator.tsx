import { type ColorPalette, Status } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface StatusIndicatorProps extends Omit<Status.RootProps, 'colorPalette'> {
	colorPalette?: ColorPalette
	label?: ReactNode
}

export default function StatusIndicator({
	children,
	colorPalette = 'gray',
	label,
	...props
}: StatusIndicatorProps) {
	return (
		<Status.Root colorPalette={colorPalette} {...props}>
			<Status.Indicator />
			{label ?? children}
		</Status.Root>
	)
}
