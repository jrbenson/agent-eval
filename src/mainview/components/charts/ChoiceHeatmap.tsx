import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { ExtractedAnswer } from '../../../shared/rpc-types'
import { buildAgentHierarchy, buildLeafLabels } from '../../utils/charts/agent-axis'
import { asMatrixData, matrixBorderless } from '../../utils/charts/matrix'
import {
	type ChartColors,
	chartBaseOptions,
	chartGridZero,
	useChartColors,
} from '../../utils/charts/theme'

function buildOption(
	agentGroups: Map<string, ExtractedAnswer[]>,
	categories: string[],
	getValue: (answer: ExtractedAnswer) => string | undefined,
	colors: ChartColors,
) {
	const agents = [...agentGroups.keys()]
	const leafLabels = buildLeafLabels(agents)
	const xData = buildAgentHierarchy(agents, leafLabels)

	// Build heatmap data: [leafLabel, category, count]
	// Include all cells; 0-count cells get borderWidth only (no fill via visualMap)
	const data: (
		| [string, string, number]
		| { value: [string, string, number]; itemStyle: { color: string } }
	)[] = []
	let maxVal = 0

	for (const agent of agents) {
		const group = agentGroups.get(agent) ?? []
		const label = leafLabels.get(agent)!
		for (const cat of categories) {
			const count = group.filter((a) => getValue(a) === cat).length
			if (count > 0) {
				data.push([label, cat, count])
				if (count > maxVal) maxVal = count
			} else {
				data.push({
					value: [label, cat, 0],
					itemStyle: { color: 'transparent' },
				})
			}
		}
	}

	return {
		...chartBaseOptions(colors),
		tooltip: {
			position: 'top',
			formatter: (params: unknown) => {
				const p = params as { value: [string, string, number] }
				return `${p.value[0]}<br/>${p.value[1]}: <b>${p.value[2]}</b>`
			},
		},
		matrix: {
			x: {
				data: asMatrixData(xData),
				label: { color: colors.fg, fontSize: 12, fontWeight: 'bold' },
				...matrixBorderless(),
			},
			y: {
				data: categories,
				label: { color: colors.fg, fontSize: 14 },
				levelSize: 180,
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
		},
		visualMap: {
			show: false,
			type: 'continuous',
			min: 1,
			max: Math.max(maxVal, 1),
			calculable: true,
			orient: 'horizontal',
			left: 'center',
			bottom: 0,
			dimension: 2,
			inRange: {
				color: [colors.primaryLight, colors.primary],
			},
			outOfRange: {
				color: 'transparent',
			},
			textStyle: { color: colors.axisLabel, fontSize: 10 },
			itemWidth: 12,
			itemHeight: 80,
		},
		series: [
			{
				type: 'heatmap',
				coordinateSystem: 'matrix',
				data,
				itemStyle: {
					borderColor: 'transparent',
					borderWidth: 0,
				},
				label: {
					show: true,
					fontSize: 14,
					fontWeight: 'bold',
					color: '#fff',
					textShadowColor: 'rgb(0, 0, 0)',
					textShadowBlur: 4,
				},
				emphasis: {
					itemStyle: { shadowBlur: 5, shadowColor: 'rgba(0, 0, 0, 0.3)' },
				},
			},
		],
	}
}

interface ResponseHeatmapProps {
	agentGroups: Map<string, ExtractedAnswer[]>
	categories: string[]
	getValue: (answer: ExtractedAnswer) => string | undefined
}

export default function ResponseHeatmap({
	agentGroups,
	categories,
	getValue,
}: ResponseHeatmapProps) {
	const colors = useChartColors()
	const option = useMemo(
		() => buildOption(agentGroups, categories, getValue, colors),
		[agentGroups, categories, getValue, colors],
	)

	const chartHeight = Math.max(250, categories.length * 32 + 120)

	return <ReactECharts option={option} style={{ height: chartHeight }} opts={{ renderer: 'svg' }} />
}
