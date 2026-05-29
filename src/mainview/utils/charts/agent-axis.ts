import { parseConfigId } from '../domain/agent-config'
import type { MatrixCell } from './matrix'

/**
 * Build a unique short label for each agent, disambiguating only when needed.
 * Returns a Map from full agentId → short display label.
 */
export function buildLeafLabels(agents: string[]): Map<string, string> {
	const parsed = agents.map((id) => ({ id, ...parseConfigId(id) }))
	const labels = new Map<string, string>()

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
 * Build hierarchical axis data for ECharts matrix coordinate system.
 * Groups agents by provider > model (opts), using short leaf labels.
 */
export function buildAgentHierarchy(
	agents: string[],
	leafLabels: Map<string, string>,
): MatrixCell[] {
	const byProvider = new Map<string, string[]>()
	for (const agent of agents) {
		const { provider } = parseConfigId(agent)
		if (!byProvider.has(provider)) byProvider.set(provider, [])
		byProvider.get(provider)!.push(agent)
	}

	if (byProvider.size === 1 && agents.length <= 2) {
		return agents.map((a) => leafLabels.get(a)!)
	}

	const result: MatrixCell[] = []
	for (const [provider, providerAgents] of byProvider) {
		if (providerAgents.length === 1) {
			result.push(leafLabels.get(providerAgents[0])!)
			continue
		}

		const byModel = new Map<string, string[]>()
		for (const agent of providerAgents) {
			const { model } = parseConfigId(agent)
			const key = model || agent
			if (!byModel.has(key)) byModel.set(key, [])
			byModel.get(key)!.push(agent)
		}

		if ([...byModel.values()].every((arr) => arr.length === 1)) {
			result.push({
				value: provider,
				children: providerAgents.map((a) => leafLabels.get(a)!),
			})
		} else {
			const modelChildren: MatrixCell[] = []
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
