import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { ExtractedAnswer } from '../../../shared/rpc-types'
import {
	type ChartColors,
	chartAxisStyle,
	chartBaseOptions,
	useChartColors,
} from '../../utils/chart-theme'

const SERIES_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4']

function buildOption(
	agentGroups: Map<string, ExtractedAnswer[]>,
	options: string[],
	colors: ChartColors,
): EChartsOption {
	const agents = [...agentGroups.keys()]
	const axisStyle = chartAxisStyle(colors)

	// For each agent + option, compute average rank (lower = better)
	const series = agents.map((agent, agentIdx) => ({
		name: agent,
		type: 'bar' as const,
		itemStyle: { color: SERIES_COLORS[agentIdx % SERIES_COLORS.length] },
		data: options.map((_opt, optIdx) => {
			const group = agentGroups.get(agent) ?? []
			const ranks: number[] = []
			for (const a of group) {
				if (a.rankingIndices && a.rankingValue) {
					const pos = a.rankingIndices.indexOf(optIdx)
					if (pos >= 0) ranks.push(pos + 1) // 1-based rank
				}
			}
			if (ranks.length === 0) return 0
			return +(ranks.reduce((s, v) => s + v, 0) / ranks.length).toFixed(1)
		}),
	}))

	return {
		...chartBaseOptions(colors),
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			formatter: (params: unknown) => {
				const items = params as {
					seriesName: string
					value: number
					marker: string
					axisValue?: string
				}[]
				if (!Array.isArray(items)) return ''
				const header = items[0]?.axisValue ?? ''
				const lines = items
					.filter((i) => i.value > 0)
					.map((i) => `${i.marker} ${i.seriesName}: avg rank ${i.value}`)
				return `<strong>${header}</strong><br/>${lines.join('<br/>')}`
			},
		},
		legend: {
			data: agents,
			textStyle: { color: colors.axisLabel, fontSize: 10 },
			bottom: 0,
		},
		grid: { left: 120, right: 20, top: 10, bottom: 50 },
		yAxis: {
			type: 'category',
			data: options,
			...axisStyle,
			axisLabel: { ...axisStyle.axisLabel, width: 100, overflow: 'truncate' },
			inverse: true,
		},
		xAxis: {
			type: 'value',
			name: 'Avg Rank (lower = preferred)',
			nameTextStyle: { color: colors.axisLabel, fontSize: 11 },
			...axisStyle,
		},
		series,
	}
}

interface RankingChartProps {
	agentGroups: Map<string, ExtractedAnswer[]>
	options: string[]
}

export default function RankingChart({ agentGroups, options }: RankingChartProps) {
	const colors = useChartColors()
	const option = useMemo(
		() => buildOption(agentGroups, options, colors),
		[agentGroups, options, colors],
	)

	const chartHeight = Math.max(120, options.length * 40 + 70)

	return <ReactECharts option={option} style={{ height: chartHeight }} opts={{ renderer: 'svg' }} />
}
