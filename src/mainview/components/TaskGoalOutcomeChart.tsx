import { Box, Card, Heading, Text } from '@chakra-ui/react'
import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { TaskRunAnalysisResult } from '../../shared/rpc-types'
import { chartAxisStyle, chartBaseOptions, useChartColors } from '../utils/chart-theme'

function buildOption(analysis: TaskRunAnalysisResult, colors: ReturnType<typeof useChartColors>) {
	const categories = analysis.aggregates.map((item) => item.agentConfigId)
	const successData = analysis.aggregates.map((item) => item.successCount)
	const failureData = analysis.aggregates.map((item) => item.failureCount)
	const axisStyle = chartAxisStyle(colors)

	const option: EChartsOption = {
		...chartBaseOptions(colors),
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			formatter: (params: unknown) => {
				const rows = params as Array<{ seriesName: string; value: number }>
				const success = rows.find((row) => row.seriesName === 'Success')?.value ?? 0
				const failure = rows.find((row) => row.seriesName === 'Failure')?.value ?? 0
				const total = success + failure
				const rate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0'
				const category = categories[rows[0] ? (rows[0].dataIndex as number) : 0] ?? 'Agent'
				return [
					`<strong>${category}</strong>`,
					`Success: ${success}`,
					`Failure: ${failure}`,
					`Total: ${total}`,
					`Success Rate: ${rate}%`,
				].join('<br/>')
			},
		},
		legend: {
			top: 0,
			textStyle: { color: colors.axisLabel, fontSize: 11 },
		},
		grid: {
			left: categories.some((item) => item.length > 20) ? 160 : 120,
			right: 24,
			top: 40,
			bottom: 30,
		},
		xAxis: {
			type: 'value',
			minInterval: 1,
			name: 'Trials',
			nameTextStyle: { color: colors.axisLabel, fontSize: 11 },
			nameLocation: 'middle',
			nameGap: 24,
			...axisStyle,
			axisLine: { show: false },
		},
		yAxis: {
			type: 'category',
			data: categories,
			inverse: true,
			...axisStyle,
			axisLabel: {
				...axisStyle.axisLabel,
				fontSize: 10,
				overflow: 'truncate',
				width: categories.some((item) => item.length > 20) ? 140 : 100,
			},
			splitLine: { show: false },
		},
		series: [
			{
				name: 'Success',
				type: 'bar',
				stack: 'total',
				data: successData,
				itemStyle: { color: colors.success },
			},
			{
				name: 'Failure',
				type: 'bar',
				stack: 'total',
				data: failureData,
				itemStyle: { color: colors.error },
			},
		],
	}

	return { option, categoryCount: categories.length }
}

export default function TaskGoalOutcomeChart({
	analysis,
}: {
	analysis: TaskRunAnalysisResult
}) {
	const colors = useChartColors()
	const { option, categoryCount } = useMemo(() => buildOption(analysis, colors), [analysis, colors])

	if (!analysis.hasGoal || analysis.aggregates.length === 0) {
		return null
	}

	const chartHeight = Math.max(120, categoryCount * 48 + 60)

	return (
		<Card.Root size="sm">
			<Card.Body>
				<Heading size="sm" mb={1}>
					Goal Outcomes
				</Heading>
				<Text fontSize="xs" color="fg.muted" mb={3}>
					{analysis.analysis.source === 'current'
						? 'Evaluated against current task definition'
						: 'Evaluated against stored snapshot'}
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
