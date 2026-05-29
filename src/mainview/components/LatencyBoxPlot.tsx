import { Box, Card, Heading } from '@chakra-ui/react'
import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { TrialSummaryResult } from '../../shared/rpc-types'
import {
	type ChartColors,
	chartAxisStyle,
	chartBaseOptions,
	useChartColors,
} from '../utils/charts/theme'

function quartiles(values: number[]) {
	const sorted = [...values].sort((a, b) => a - b)
	const n = sorted.length
	if (n === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 }
	const q = (p: number) => {
		const pos = p * (n - 1)
		const lo = Math.floor(pos)
		const hi = Math.ceil(pos)
		return lo === hi ? sorted[lo] : sorted[lo] * (hi - pos) + sorted[hi] * (pos - lo)
	}
	return {
		min: sorted[0],
		q1: q(0.25),
		median: q(0.5),
		q3: q(0.75),
		max: sorted[n - 1],
	}
}

function buildOption(
	results: TrialSummaryResult[],
	colors: ChartColors,
): { option: EChartsOption; hasData: boolean; categoryCount: number } {
	// Group by agentConfigId
	const groups = new Map<string, number[]>()
	for (const r of results) {
		if (r.status !== 'completed') continue
		const key = r.agentConfigId
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(r.latencyMs / 1000)
	}

	if (groups.size === 0) return { option: {} as EChartsOption, hasData: false, categoryCount: 0 }

	// Sort categories by median latency (shortest first)
	const categories = [...groups.keys()].sort((a, b) => {
		const medA = quartiles(groups.get(a)!).median
		const medB = quartiles(groups.get(b)!).median
		return medA - medB
	})
	const boxData: number[][] = []
	const scatterData: [number, number][] = []

	for (let i = 0; i < categories.length; i++) {
		const values = groups.get(categories[i])!
		const q = quartiles(values)
		boxData.push([q.min, q.q1, q.median, q.q3, q.max])
		for (const v of values) {
			const jitter = (Math.random() - 0.5) * 0.3
			scatterData.push([v, i + jitter])
		}
	}

	const axisStyle = chartAxisStyle(colors)

	const opt: EChartsOption = {
		...chartBaseOptions(colors),
		tooltip: {
			trigger: 'item',
			formatter: (params: unknown) => {
				const p = params as {
					seriesType: string
					value: number[]
					name: string
				}
				if (p.seriesType === 'boxplot') {
					return [
						`<strong>${categories[p.value[0]] ?? p.name}</strong>`,
						`Max: ${p.value[5].toFixed(1)}s`,
						`Q3: ${p.value[4].toFixed(1)}s`,
						`Median: ${p.value[3].toFixed(1)}s`,
						`Q1: ${p.value[2].toFixed(1)}s`,
						`Min: ${p.value[1].toFixed(1)}s`,
					].join('<br/>')
				}
				return `${p.value[0].toFixed(1)}s`
			},
		},
		grid: {
			left: categories.some((c) => c.length > 20) ? 160 : 120,
			right: 30,
			top: 10,
			bottom: 30,
		},
		yAxis: {
			type: 'category',
			data: categories,
			...axisStyle,
			axisLabel: {
				...axisStyle.axisLabel,
				fontSize: 10,
				overflow: 'truncate',
				width: categories.some((c) => c.length > 20) ? 140 : 100,
			},
			splitLine: { show: false },
			inverse: true,
		},
		xAxis: {
			type: 'value',
			scale: true,
			name: 'Latency (s)',
			nameTextStyle: { color: colors.axisLabel, fontSize: 11 },
			nameLocation: 'middle',
			nameGap: 20,
			...axisStyle,
			axisLine: { show: false },
		},
		series: [
			{
				name: 'Latency',
				type: 'boxplot',
				data: boxData,
				itemStyle: {
					color: colors.primaryBg,
					borderColor: colors.primary,
					borderWidth: 1.5,
				},
				emphasis: {
					itemStyle: {
						borderColor: colors.primaryLight,
						borderWidth: 2,
					},
				},
			},
			{
				name: 'Trials',
				type: 'scatter',
				data: scatterData,
				itemStyle: {
					color: colors.primary,
					opacity: 0.6,
				},
				symbolSize: 6,
			},
		],
	}

	return { option: opt, hasData: true, categoryCount: categories.length }
}

export default function LatencyBoxPlot({
	results,
}: {
	results: TrialSummaryResult[]
}) {
	const colors = useChartColors()
	const { option, hasData, categoryCount } = useMemo(
		() => buildOption(results, colors),
		[results, colors],
	)

	if (!hasData) return null

	const chartHeight = Math.max(120, categoryCount * 25 + 40)

	return (
		<Card.Root size="sm">
			<Card.Body>
				<Heading size="sm" mb={2}>
					Latency Distribution
				</Heading>
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
