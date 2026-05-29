import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { ExtractedAnswer } from '../../../shared/rpc-types'
import {
	type ChartColors,
	chartBaseOptions,
	chartGridZero,
	useChartColors,
} from '../../utils/charts/theme'
import { SERIES_COLORS } from '../../utils/charts/theme'

function buildHistogramOption(
	_optionLabel: string,
	optionIdx: number,
	agentGroups: Map<string, ExtractedAnswer[]>,
	totalOptions: number,
	maxCount: number,
	colors: ChartColors,
) {
	// Count how many times this option was placed at each rank across all agents/trials
	const rankCounts = new Array(totalOptions).fill(0)

	for (const answers of agentGroups.values()) {
		for (const a of answers) {
			if (a.rankingIndices) {
				const pos = a.rankingIndices.indexOf(optionIdx)
				if (pos >= 0) rankCounts[pos]++
			}
		}
	}

	const rankLabels = rankCounts.map((_, i) => `${i + 1}`)
	const color = SERIES_COLORS[optionIdx % SERIES_COLORS.length]

	return {
		...chartBaseOptions(colors),
		grid: { ...chartGridZero, containLabel: true },
		xAxis: {
			type: 'category' as const,
			data: rankLabels,
			axisLabel: { color: colors.axisLabel, fontSize: 10 },
			axisLine: { lineStyle: { color: colors.axisLine } },
			axisTick: { show: false },
		},
		yAxis: {
			type: 'value' as const,
			max: maxCount > 0 ? maxCount : undefined,
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
				data: rankCounts,
				barWidth: '100%',
				itemStyle: { color },
			},
		],
		tooltip: {
			formatter: (params: unknown) => {
				const p = params as { name: string; value: number }
				return `Rank ${p.name}: <b>${p.value}</b>`
			},
		},
	}
}

interface RankingDistributionProps {
	agentGroups: Map<string, ExtractedAnswer[]>
	options: string[]
}

export default function RankingDistribution({ agentGroups, options }: RankingDistributionProps) {
	const colors = useChartColors()

	// Compute global max count across all options for shared y-axis scale
	const maxCount = useMemo(() => {
		let max = 0
		for (let optIdx = 0; optIdx < options.length; optIdx++) {
			const rankCounts = new Array(options.length).fill(0)
			for (const answers of agentGroups.values()) {
				for (const a of answers) {
					if (a.rankingIndices) {
						const pos = a.rankingIndices.indexOf(optIdx)
						if (pos >= 0) rankCounts[pos]++
					}
				}
			}
			for (const c of rankCounts) {
				if (c > max) max = c
			}
		}
		return max
	}, [agentGroups, options])

	const charts = useMemo(
		() =>
			options.map((label, idx) => ({
				label,
				option: buildHistogramOption(label, idx, agentGroups, options.length, maxCount, colors),
			})),
		[options, agentGroups, maxCount, colors],
	)

	return (
		<SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={3}>
			{charts.map((chart) => (
				<Box
					key={chart.label}
					borderWidth="1px"
					borderColor="border.subtle"
					borderRadius="md"
					p={2}
				>
					<Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={1} truncate>
						{chart.label}
					</Text>
					<ReactECharts option={chart.option} style={{ height: 120 }} opts={{ renderer: 'svg' }} />
				</Box>
			))}
		</SimpleGrid>
	)
}
