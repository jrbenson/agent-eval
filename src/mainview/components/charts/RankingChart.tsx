import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { ExtractedAnswer } from '../../../shared/rpc-types'
import { buildAgentHierarchy, buildLeafLabels } from '../../utils/charts/agent-axis'
import { asMatrixData, matrixBorderless } from '../../utils/charts/matrix'
import {
	type ChartColors,
	SERIES_COLORS,
	chartBaseOptions,
	chartGridZero,
	useChartColors,
} from '../../utils/charts/theme'

function buildOption(
	agentGroups: Map<string, ExtractedAnswer[]>,
	options: string[],
	colors: ChartColors,
) {
	const agents = [...agentGroups.keys()]
	const leafLabels = buildLeafLabels(agents)
	const xData = buildAgentHierarchy(agents, leafLabels)

	// Y axis: rank positions 1..N
	const rankLabels = options.map((_, i) => `${i + 1}`)

	// One pie series per matrix cell (agent × rank)
	const series: object[] = []

	for (const agent of agents) {
		const group = agentGroups.get(agent) ?? []
		const label = leafLabels.get(agent)!

		for (let rank = 0; rank < options.length; rank++) {
			// Count how many times each option was placed at this rank
			const data: { value: number; name: string }[] = []
			for (let optIdx = 0; optIdx < options.length; optIdx++) {
				let count = 0
				for (const a of group) {
					if (a.rankingIndices && a.rankingIndices[rank] === optIdx) {
						count++
					}
				}
				if (count > 0) {
					data.push({ value: count, name: options[optIdx] })
				}
			}

			if (data.length > 0) {
				series.push({
					type: 'pie',
					coordinateSystem: 'matrix',
					center: [label, `${rank + 1}`],
					radius: '80%',
					data,
					label: { show: false },
					labelLine: { show: false },
					emphasis: { label: { show: false } },
					color: data.map((d) => SERIES_COLORS[options.indexOf(d.name) % SERIES_COLORS.length]),
				})
			}
		}
	}

	return {
		...chartBaseOptions(colors),
		tooltip: { show: true },
		legend: {
			data: options,
			textStyle: { color: colors.axisLabel, fontSize: 10 },
			bottom: 0,
			type: 'scroll' as const,
		},
		matrix: {
			x: {
				data: asMatrixData(xData),
				label: { color: colors.fg, fontSize: 12, fontWeight: 'bold' },
				...matrixBorderless(),
			},
			y: {
				data: rankLabels,
				label: { color: colors.fg, fontSize: 11 },
				...matrixBorderless(),
			},
			body: {
				itemStyle: { borderWidth: 0 },
			},
			backgroundStyle: {
				color: 'transparent',
				borderColor: 'transparent',
				borderWidth: 0,
			},
			...chartGridZero,
			bottom: 30,
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

	const chartHeight = Math.max(200, options.length * 36 + 100)

	return <ReactECharts option={option} style={{ height: chartHeight }} opts={{ renderer: 'svg' }} />
}
