import type { Provider } from '../../shared/schemas/agent-config.schema'
import { getApiKey, getProviderConfig } from './settings'

interface ProviderConfig {
	listModelsUrl: string | null
	authHeader: (key: string) => Record<string, string>
	parseModels: (json: unknown) => string[]
	filterModel?: (id: string) => boolean
	/** Build a dynamic URL using provider config (e.g. Azure resource name). Overrides listModelsUrl when present. */
	buildUrl?: (config: Record<string, string>) => string | null
}

const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
	openai: {
		listModelsUrl: 'https://api.openai.com/v1/models',
		authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
		parseModels: (json) => {
			const data = (json as { data: { id: string }[] }).data
			return data.map((m) => m.id)
		},
		filterModel: (id) =>
			/^(gpt-|o[134]-|chatgpt-)/.test(id) &&
			!/^(gpt-.*-(realtime|audio|transcribe|search))/.test(id),
	},
	anthropic: {
		listModelsUrl: 'https://api.anthropic.com/v1/models',
		authHeader: (key) => ({
			'x-api-key': key,
			'anthropic-version': '2023-06-01',
		}),
		parseModels: (json) => {
			const data = (json as { data: { id: string }[] }).data
			return data.map((m) => m.id)
		},
		filterModel: (id) => id.startsWith('claude-'),
	},
	google: {
		listModelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
		authHeader: () => ({}),
		parseModels: (json) => {
			const models = (json as { models: { name: string }[] }).models
			return models.map((m) => m.name.replace(/^models\//, ''))
		},
		filterModel: (id) => id.includes('gemini'),
	},
	groq: {
		listModelsUrl: 'https://api.groq.com/openai/v1/models',
		authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
		parseModels: (json) => {
			const data = (json as { data: { id: string }[] }).data
			return data.map((m) => m.id)
		},
	},
	mistral: {
		listModelsUrl: 'https://api.mistral.ai/v1/models',
		authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
		parseModels: (json) => {
			const data = (json as { data: { id: string }[] }).data
			return data.map((m) => m.id)
		},
	},
	xai: {
		listModelsUrl: 'https://api.x.ai/v1/models',
		authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
		parseModels: (json) => {
			const data = (json as { data: { id: string }[] }).data
			return data.map((m) => m.id)
		},
		filterModel: (id) => id.startsWith('grok-'),
	},
	azure: {
		listModelsUrl: null,
		buildUrl: (config) => {
			const resourceName = config.resourceName
			if (!resourceName) return null
			return `https://${resourceName}.openai.azure.com/openai/models?api-version=2024-10-21`
		},
		authHeader: (key) => ({ 'api-key': key }),
		parseModels: (json) => {
			const data = (
				json as {
					data: {
						id: string
						capabilities?: { chat_completion?: boolean; inference?: boolean }
					}[]
				}
			).data
			return data.filter((m) => m.capabilities?.inference !== false).map((m) => m.id)
		},
	},
}

function isProvider(name: string): name is Provider {
	return name in PROVIDER_CONFIGS
}

async function fetchModelsRaw(provider: Provider, apiKey: string): Promise<string[]> {
	const config = PROVIDER_CONFIGS[provider]

	let url: string | null = config.listModelsUrl
	const headers: Record<string, string> = {
		...config.authHeader(apiKey),
	}

	// Providers with dynamic URLs (e.g. Azure needs resource name)
	if (config.buildUrl) {
		const providerCfg = getProviderConfig(provider)
		url = config.buildUrl(providerCfg)
		if (!url) {
			throw new Error(`Missing configuration for provider: ${provider}`)
		}
	}

	if (!url) {
		throw new Error(`No models URL for provider: ${provider}`)
	}

	// Google uses query param auth
	if (provider === 'google') {
		url = `${url}?key=${apiKey}`
	}

	const response = await fetch(url, {
		headers,
		signal: AbortSignal.timeout(15_000),
	})

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`)
	}

	const json = await response.json()
	let models = config.parseModels(json)

	if (config.filterModel) {
		models = models.filter(config.filterModel)
	}

	return models.sort()
}

// ---- In-memory model cache ----

const modelCache = new Map<string, { models: string[]; fetchedAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Invalidate the cached model list for a provider, or all providers.
 * Call when API keys or provider config change.
 */
export function invalidateModelCache(provider?: string): void {
	if (provider) {
		modelCache.delete(provider)
	} else {
		modelCache.clear()
	}
}

/**
 * Validate an API key by attempting to list models.
 * Returns true if the key is valid, false otherwise.
 */
export async function validateApiKey(provider: string): Promise<boolean> {
	if (!isProvider(provider)) return false

	const apiKey = await getApiKey(provider)
	if (!apiKey) return false

	// Azure requires resource name — can't validate without it
	const config = PROVIDER_CONFIGS[provider]
	if (config.buildUrl) {
		const providerCfg = getProviderConfig(provider)
		const url = config.buildUrl(providerCfg)
		if (!url) return false
	}

	try {
		await fetchModelsRaw(provider, apiKey)
		return true
	} catch {
		return false
	}
}

/**
 * List available models for a provider.
 * For Azure, returns the manually configured deployment list from settings.
 * For other providers, fetches from the API with a 10-minute cache.
 */
export async function listModels(provider: string): Promise<string[]> {
	if (!isProvider(provider)) return []

	// Azure uses a manually configured model/deployment list
	if (provider === 'azure') {
		const config = getProviderConfig('azure')
		if (config.models) {
			try {
				const parsed = JSON.parse(config.models)
				if (Array.isArray(parsed)) return parsed
			} catch {
				// Malformed JSON — fall through to empty
			}
		}
		return []
	}

	const apiKey = await getApiKey(provider)
	if (!apiKey) return []

	const cached = modelCache.get(provider)
	if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
		return cached.models
	}

	try {
		const models = await fetchModelsRaw(provider, apiKey)
		modelCache.set(provider, { models, fetchedAt: Date.now() })
		return models
	} catch (err) {
		console.warn(
			`[providers] Failed to fetch models for ${provider}:`,
			err instanceof Error ? err.message : err,
		)
		return cached?.models ?? []
	}
}
