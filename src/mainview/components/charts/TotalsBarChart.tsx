import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { ExtractedAnswer } from '../../../shared/rpc-types'
import {
	type ChartColors,
	chartBaseOptions,
	chartGridZero,
	useChartColors,
} from '../../utils/charts/theme'

function buildOption(
	agentGroups: Map<string, ExtractedAnswer[]>,
	categories: string[],
	getValue: (a: ExtractedAnswer) => string | undefined,
	colors: ChartColors,
) {
	// Count totals per category across all agents
	const counts = new Map<string, number>()
	for (const cat of categories) counts.set(cat, 0)

	for (const answers of agentGroups.values()) {
		for (const a of answers) {
			const val = getValue(a)
			if (val && counts.has(val)) {
				counts.set(val, counts.get(val)! + 1)
			}
		}
	}

	// Sort categories by count descending (highest at top → reversed for y-axis)
	const sorted = [...categories].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))
	const data = sorted.map((cat) => counts.get(cat) ?? 0)

	return {
		...chartBaseOptions(colors),
		tooltip: {
			trigger: 'axis' as const,
			axisPointer: { type: 'shadow' as const },
		},
		grid: {
			...chartGridZero,
			containLabel: true,
		},
		yAxis: {
			type: 'category' as const,
			data: sorted,
			axisLabel: {
				color: colors.axisLabel,
				fontSize: 10,
				width: 140,
				overflow: 'truncate' as const,
				ellipsis: '...',
			},
			axisLine: { lineStyle: { color: colors.axisLine } },
			axisTick: { show: false },
		},
		xAxis: {
			type: 'value' as const,
			axisLabel: { color: colors.axisLabel, fontSize: 10 },
			axisLine: { show: false },
			axisTick: { show: false },
			splitLine: {
				lineStyle: { color: colors.gridLine, type: 'dashed' as const },
			},
		},
		series: [
			{
				type: 'bar' as const,
				data,
				itemStyle: { color: colors.primary },
				barMaxWidth: 24,
			},
		],
	}
}

interface TotalsBarChartProps {
	agentGroups: Map<string, ExtractedAnswer[]>
	categories: string[]
	getValue: (a: ExtractedAnswer) => string | undefined
}

export default function TotalsBarChart({ agentGroups, categories, getValue }: TotalsBarChartProps) {
	const colors = useChartColors()
	const option = useMemo(
		() => buildOption(agentGroups, categories, getValue, colors),
		[agentGroups, categories, getValue, colors],
	)

	const chartHeight = Math.max(120, categories.length * 28 + 40)

	return <ReactECharts option={option} style={{ height: chartHeight }} opts={{ renderer: 'svg' }} />
}
