import { system } from '../theme'

/**
 * Resolve Chakra UI color tokens into hex values for use in ECharts.
 * Semantic tokens (fg, border) resolve to CSS variables which ECharts can't use,
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
 * Spread into chart options for consistent styling.
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
