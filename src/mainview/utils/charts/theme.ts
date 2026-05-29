import { system } from '../../theme'

/**
 * Resolve Chakra UI color tokens into hex values for use in ECharts.
 * Semantic tokens resolve to CSS variables which ECharts can't use,
 * so we resolve them at runtime via getComputedStyle.
 */
function resolveCssVar(value: string): string {
	if (!value.startsWith('var(')) return value
	const varName = value.slice(4, -1).trim()
	if (typeof document !== 'undefined') {
		return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
	}
	return value
}

export function useChartColors() {
	const token = (path: string) => resolveCssVar(system.token(`colors.${path}`, ''))
	const font = system.token('fonts.body', 'sans-serif')

	return {
		// Primary series colors
		primary: token('blue.400'),
		primaryLight: token('blue.300'),
		primaryDark: token('blue.700'),
		primaryBg: token('blue.800'),

		// Accent
		accent: token('blue.500'),

		// Semantic
		success: token('green.400'),
		error: token('red.400'),
		warning: token('yellow.400'),

		// Neutral / axis / grid
		fg: token('fg'),
		axisLabel: token('fg.muted'),
		axisLine: token('border.muted'),
		gridLine: token('border.subtle'),
		muted: token('fg.subtle'),
		fontFamily: font,
	}
}

export type ChartColors = ReturnType<typeof useChartColors>

/**
 * Base ECharts theme options derived from Chakra colors.
 */
export function chartBaseOptions(colors: ChartColors) {
	return {
		backgroundColor: 'transparent',
		textStyle: {
			color: colors.axisLabel,
			fontFamily: colors.fontFamily,
		},
	}
}

/**
 * Standard axis styling for value/category axes.
 */
export function chartAxisStyle(colors: ChartColors) {
	return {
		axisLabel: { color: colors.axisLabel, fontSize: 11 },
		axisLine: { lineStyle: { color: colors.axisLine } },
		axisTick: { show: false },
		splitLine: {
			lineStyle: { color: colors.gridLine, type: 'dashed' as const },
			show: true,
		},
	}
}

/** Standard series color palette. */
export const SERIES_COLORS = [
	'#3b82f6',
	'#8b5cf6',
	'#ec4899',
	'#f97316',
	'#22c55e',
	'#06b6d4',
	'#f43f5e',
	'#a855f7',
	'#14b8a6',
	'#eab308',
]

/** Zero-padding grid/matrix positioning — containers handle all spacing. */
export const chartGridZero = { top: 0, bottom: 0, left: 0, right: 0 } as const
