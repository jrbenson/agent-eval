import { Box, Card, Heading, Text } from '@chakra-ui/react'
import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { VariantAnalysisResult } from '../../shared/rpc-types'
import { chartBaseOptions, useChartColors } from '../utils/chart-theme'

function buildComparisonOption(
	variants: VariantAnalysisResult[],
	colors: ReturnType<typeof useChartColors>,
) {
	const variantLabels = variants.map((v) => v.variantLabel)
	const agentConfigIds = [
		...new Set(variants.flatMap((v) => v.aggregates.map((a) => a.agentConfigId))),
	]

	// Build heatmap data: [xIndex, yIndex, value]
	const data: [number, number, number][] = []
	for (let xi = 0; xi < variants.length; xi++) {
		for (let yi = 0; yi < agentConfigIds.length; yi++) {
			const agg = variants[xi].aggregates.find((a) => a.agentConfigId === agentConfigIds[yi])
			const rate =
				agg && agg.total > 0 ? Number(((agg.successCount / agg.total) * 100).toFixed(1)) : 0
			data.push([xi, yi, rate])
		}
	}

	const option: EChartsOption = {
		...chartBaseOptions(colors),
		tooltip: {
			position: 'top',
			formatter: (params: { name: string; data: [number, number, number] }) =>
				`${params.name}<br/>${variantLabels[params.data[0]]}: <b>${params.data[2]}%</b>`,
		},
		grid: {
			left: agentConfigIds.some((id) => id.length > 20) ? 160 : 120,
			right: 60,
			top: 24,
			bottom: 40,
		},
		xAxis: {
			type: 'category',
			data: variantLabels,
			position: 'bottom',
			axisLabel: { color: colors.axisLabel, fontSize: 11 },
			splitArea: { show: false },
			axisLine: { show: false },
			axisTick: { show: false },
		},
		yAxis: {
			type: 'category',
			data: agentConfigIds,
			inverse: true,
			axisLabel: {
				color: colors.axisLabel,
				fontSize: 10,
				overflow: 'truncate',
				width: agentConfigIds.some((id) => id.length > 20) ? 140 : 100,
			},
			splitArea: { show: false },
			axisLine: { show: false },
			axisTick: { show: false },
		},
		visualMap: {
			min: 0,
			max: 100,
			calculable: true,
			orient: 'vertical',
			right: 0,
			top: 'center',
			inRange: {
				color: ['rgba(72, 187, 120, 0.1)', 'rgba(72, 187, 120, 1)'],
			},
			textStyle: { color: colors.axisLabel, fontSize: 10 },
			text: ['100%', '0%'],
		},
		series: [
			{
				type: 'heatmap',
				data,
				label: {
					show: true,
					formatter: (params: { data: [number, number, number] }) => `${params.data[2]}%`,
					fontSize: 11,
					color: colors.axisLabel,
				},
				emphasis: {
					itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.3)' },
				},
			},
		],
	}

	return {
		option,
		agentCount: agentConfigIds.length,
		variantCount: variants.length,
	}
}

export default function VariantComparisonChart({
	variants,
}: {
	variants: VariantAnalysisResult[]
}) {
	const colors = useChartColors()
	const { option, agentCount } = useMemo(
		() => buildComparisonOption(variants, colors),
		[variants, colors],
	)

	if (variants.length === 0) return null

	const chartHeight = Math.max(140, agentCount * 40 + 80)

	return (
		<Card.Root size="sm">
			<Card.Body>
				<Heading size="sm" mb={1}>
					Goal Outcomes
				</Heading>
				<Text fontSize="xs" color="fg.muted" mb={3}>
					Success rate heatmap across task variants per agent configuration
				</Text>
				<Box>
					<ReactECharts
						option={option}
						style={{ height: chartHeight }}
						opts={{ renderer: 'svg' }}
						notMerge
					/>
				</Box>
			</Card.Body>
		</Card.Root>
	)
}
