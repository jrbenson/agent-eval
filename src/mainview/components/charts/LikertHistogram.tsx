import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { ExtractedAnswer } from '../../../shared/rpc-types'
import {
	type ChartColors,
	chartBaseOptions,
	chartGridZero,
	useChartColors,
} from '../../utils/charts/theme'

const LIKERT_LABELS = ['1', '2', '3', '4', '5']

function buildOption(agentGroups: Map<string, ExtractedAnswer[]>, colors: ChartColors) {
	const counts = [0, 0, 0, 0, 0]

	for (const answers of agentGroups.values()) {
		for (const a of answers) {
			if (a.likertValue && a.likertValue >= 1 && a.likertValue <= 5) {
				counts[a.likertValue - 1]++
			}
		}
	}

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
		xAxis: {
			type: 'category' as const,
			data: LIKERT_LABELS,
			axisLabel: { color: colors.axisLabel, fontSize: 11 },
			axisLine: { lineStyle: { color: colors.axisLine } },
			axisTick: { show: false },
		},
		yAxis: {
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
				data: counts,
				barWidth: '100%',
				itemStyle: { color: colors.primary },
			},
		],
	}
}

interface LikertHistogramProps {
	agentGroups: Map<string, ExtractedAnswer[]>
}

export default function LikertHistogram({ agentGroups }: LikertHistogramProps) {
	const colors = useChartColors()
	const option = useMemo(() => buildOption(agentGroups, colors), [agentGroups, colors])

	return <ReactECharts option={option} style={{ height: 140 }} opts={{ renderer: 'svg' }} />
}
