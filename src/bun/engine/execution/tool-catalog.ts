import type { ResolvedToolDef } from '../tool-runtime'

export type ToolSearchMode = 'keyword' | 'semantic'
export type ToolSearchHints = 'none' | 'names_only' | 'names_and_descriptions'

export interface ToolCatalog {
	searchableTools: ResolvedToolDef[]
	discoveredToolNames: Set<string>
	searchMode: ToolSearchMode
	searchHints: ToolSearchHints
}

export function createToolCatalog(args: {
	resolvedTools: ResolvedToolDef[]
	searchEnabled: boolean
	searchMode?: ToolSearchMode
	searchHints?: ToolSearchHints
}): ToolCatalog {
	const coreTools = args.resolvedTools.filter((tool) => tool.core)
	return {
		searchableTools: args.searchEnabled ? args.resolvedTools.filter((tool) => !tool.core) : [],
		discoveredToolNames: new Set(coreTools.map((tool) => tool.name)),
		searchMode: args.searchMode ?? 'keyword',
		searchHints: args.searchHints ?? 'none',
	}
}

export function createChildToolCatalog(
	parentCatalog: ToolCatalog,
	resolvedTools: ResolvedToolDef[],
): ToolCatalog {
	return {
		searchableTools: parentCatalog.searchableTools,
		discoveredToolNames: new Set(
			resolvedTools.filter((tool) => tool.core).map((tool) => tool.name),
		),
		searchMode: parentCatalog.searchMode,
		searchHints: parentCatalog.searchHints,
	}
}

export function discoverToolNames(catalog: ToolCatalog, toolNames: Iterable<string>) {
	for (const toolName of toolNames) {
		catalog.discoveredToolNames.add(toolName)
	}
}

export function hasDiscoveredTool(catalog: ToolCatalog, toolName: string): boolean {
	return catalog.discoveredToolNames.has(toolName)
}

export function getActiveToolNames(catalog: ToolCatalog): string[] {
	return [...catalog.discoveredToolNames]
}
