import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { ExtractedAnswer } from '../../../shared/rpc-types'
import { type ChartColors, chartBaseOptions, useChartColors } from '../../utils/chart-theme'

/**
 * Parse agentConfigId into hierarchy segments.
 * Format: "provider:model" or "provider:model (opts)"
 */
function parseConfigId(id: string): {
	provider: string
	model: string
	opts: string
} {
	// Match "provider:model (opts)" or "provider:model"
	const match = id.match(/^([^:]+):(.+?)\s*(?:\((.+)\))?$/)
	if (!match) return { provider: id, model: '', opts: '' }
	return {
		provider: match[1],
		model: match[2].trim(),
		opts: match[3] ?? '',
	}
}

/**
 * Build a unique short label for each agent, disambiguating only when needed.
 * Returns a Map from full agentId → short display label.
 */
function buildLeafLabels(agents: string[]): Map<string, string> {
	const parsed = agents.map((id) => ({ id, ...parseConfigId(id) }))
	const labels = new Map<string, string>()

	// Try model name first, add opts if duplicates
	const modelCounts = new Map<string, number>()
	for (const p of parsed) {
		const key = p.model || p.id
		modelCounts.set(key, (modelCounts.get(key) ?? 0) + 1)
	}

	for (const p of parsed) {
		const model = p.model || p.id
		if (modelCounts.get(model)! > 1 && p.opts) {
			labels.set(p.id, `${model} (${p.opts})`)
		} else {
			labels.set(p.id, model)
		}
	}

	// Final uniqueness check — if still duplicates, use full id
	const seen = new Map<string, string[]>()
	for (const [id, label] of labels) {
		if (!seen.has(label)) seen.set(label, [])
		seen.get(label)!.push(id)
	}
	for (const [, ids] of seen) {
		if (ids.length > 1) {
			for (const id of ids) labels.set(id, id)
		}
	}

	return labels
}

/**
 * Build hierarchical axis data for ECharts matrix.
 * Groups agents by provider > model (opts), using short leaf labels.
 */
function buildAgentHierarchy(agents: string[], leafLabels: Map<string, string>): unknown[] {
	// Group by provider
	const byProvider = new Map<string, string[]>()
	for (const agent of agents) {
		const { provider } = parseConfigId(agent)
		if (!byProvider.has(provider)) byProvider.set(provider, [])
		byProvider.get(provider)!.push(agent)
	}

	// Single provider with few agents — flat list
	if (byProvider.size === 1 && agents.length <= 2) {
		return agents.map((a) => leafLabels.get(a)!)
	}

	const result: unknown[] = []
	for (const [provider, providerAgents] of byProvider) {
		if (providerAgents.length === 1) {
			result.push(leafLabels.get(providerAgents[0])!)
			continue
		}

		// Group by model within provider
		const byModel = new Map<string, string[]>()
		for (const agent of providerAgents) {
			const { model } = parseConfigId(agent)
			const key = model || agent
			if (!byModel.has(key)) byModel.set(key, [])
			byModel.get(key)!.push(agent)
		}

		// If all agents under this provider have unique models, group under provider only
		if ([...byModel.values()].every((arr) => arr.length === 1)) {
			result.push({
				value: provider,
				children: providerAgents.map((a) => leafLabels.get(a)!),
			})
		} else {
			// Sub-group by model when same model has multiple opts
			const modelChildren: unknown[] = []
			for (const [model, modelAgents] of byModel) {
				if (modelAgents.length === 1) {
					modelChildren.push(leafLabels.get(modelAgents[0])!)
				} else {
					modelChildren.push({
						value: model,
						children: modelAgents.map((a) => leafLabels.get(a)!),
					})
				}
			}
			result.push({ value: provider, children: modelChildren })
		}
	}

	return result
}

function buildOption(
	agentGroups: Map<string, ExtractedAnswer[]>,
	categories: string[],
	getValue: (answer: ExtractedAnswer) => string | undefined,
	colors: ChartColors,
): EChartsOption {
	const agents = [...agentGroups.keys()]
	const leafLabels = buildLeafLabels(agents)
	const xData = buildAgentHierarchy(agents, leafLabels)

	// Build heatmap data: [leafLabel, category, count]
	// Include all cells; 0-count cells get borderWidth only (no fill via visualMap)
	const data: unknown[] = []
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
				data: xData,
				label: { color: colors.fg, fontSize: 12, fontWeight: 'bold' },
			},
			y: {
				data: categories,
				label: { color: colors.fg, fontSize: 11 },
				levelSize: 160,
			},
			backgroundStyle: {
				color: 'transparent',
				borderColor: 'transparent',
				borderWidth: 0,
			},
			top: 40,
			bottom: 60,
			left: 20,
			right: 20,
		},
		visualMap: {
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
					borderColor: colors.gridLine,
					borderWidth: 1,
				},
				label: {
					show: true,
					fontSize: 11,
					fontWeight: 'bold',
					color: '#fff',
					textShadowColor: 'rgba(0,0,0,0.6)',
					textShadowBlur: 2,
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
