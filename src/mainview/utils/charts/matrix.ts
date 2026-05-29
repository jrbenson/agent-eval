import type { EChartsOption } from 'echarts'

export type MatrixCell = string | { value: string; children: MatrixCell[] }

/**
 * Common matrix config options for removing borders and dividers.
 */
export function matrixBorderless() {
	return {
		itemStyle: { borderColor: 'transparent', borderWidth: 0 },
		dividerLineStyle: { width: 1 },
	} as const
}

/**
 * Type-cast helper for matrix axis data (works around ECharts strict children typing).
 */
export function asMatrixData(data: MatrixCell[]) {
	return data as EChartsOption['matrix'] extends { x?: { data?: infer D } } ? D : never
}
