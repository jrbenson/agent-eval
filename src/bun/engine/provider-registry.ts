import type { LanguageModelV3 } from '@ai-sdk/provider'
import type { Provider } from '../../shared/schemas/agent-config.schema'
import { getApiKey, getProviderConfig } from '../data/settings'
import type { UtilityLlmProfile } from '../data/settings'

export interface HarnessConfig {
	provider: Provider
	model: string
	temperature: number
	maxTokens?: number
	topP?: number
	reasoning?: string
}

export type ProviderModelResolver = (
	config: HarnessConfig,
) => LanguageModelV3 | Promise<LanguageModelV3>

let providerModelResolverForTests: ProviderModelResolver | null = null

export function setProviderModelResolverForTests(resolver: ProviderModelResolver): void {
	providerModelResolverForTests = resolver
}

export function resetProviderModelResolverForTests(): void {
	providerModelResolverForTests = null
}

// --- Provider Resolvers ---
// Each resolver lazily imports its SDK and returns a LanguageModelV3.

type ProviderResolverFn = (config: HarnessConfig) => Promise<LanguageModelV3>

/** Helper for simple providers that take { apiKey } and return a model factory */
function simpleResolver(
	importFn: () => Promise<(opts: { apiKey: string }) => (model: string) => LanguageModelV3>,
): ProviderResolverFn {
	return async (config) => {
		const apiKey = await getApiKey(config.provider)
		if (!apiKey) throw new Error(`No API key configured for provider: ${config.provider}`)
		const factory = await importFn()
		// biome-ignore lint/suspicious/noExplicitAny: provider factory types vary
		const provider = (factory as any)({ apiKey })
		return provider(config.model)
	}
}

const PROVIDER_RESOLVERS: Record<Provider, ProviderResolverFn> = {
	// --- Primary ---
	openai: simpleResolver(async () => (await import('@ai-sdk/openai')).createOpenAI),
	anthropic: simpleResolver(async () => (await import('@ai-sdk/anthropic')).createAnthropic),
	google: simpleResolver(async () => (await import('@ai-sdk/google')).createGoogleGenerativeAI),
	mistral: simpleResolver(async () => (await import('@ai-sdk/mistral')).createMistral),
	groq: simpleResolver(async () => (await import('@ai-sdk/groq')).createGroq),
	xai: simpleResolver(async () => (await import('@ai-sdk/xai')).createXai),

	azure: async (config) => {
		const apiKey = await getApiKey('azure')
		if (!apiKey) throw new Error('No API key configured for provider: azure')
		const azureConfig = getProviderConfig('azure')
		const resourceName = azureConfig.resourceName
		if (!resourceName) throw new Error('Azure resource name not configured. Set it in Settings.')
		const { createAzure } = await import('@ai-sdk/azure')
		const provider = createAzure({ resourceName, apiKey })
		return provider(config.model)
	},

	// --- Tier 1 — simple API-key providers ---
	deepseek: simpleResolver(async () => (await import('@ai-sdk/deepseek')).createDeepSeek),
	fireworks: simpleResolver(async () => (await import('@ai-sdk/fireworks')).createFireworks),
	togetherai: simpleResolver(async () => (await import('@ai-sdk/togetherai')).createTogetherAI),
	cohere: simpleResolver(async () => (await import('@ai-sdk/cohere')).createCohere),
	cerebras: simpleResolver(async () => (await import('@ai-sdk/cerebras')).createCerebras),
	deepinfra: simpleResolver(async () => (await import('@ai-sdk/deepinfra')).createDeepInfra),
	moonshotai: simpleResolver(async () => (await import('@ai-sdk/moonshotai')).createMoonshotAI),
	alibaba: simpleResolver(async () => (await import('@ai-sdk/alibaba')).createAlibaba),
	huggingface: simpleResolver(async () => (await import('@ai-sdk/huggingface')).createHuggingFace),
	baseten: simpleResolver(async () => (await import('@ai-sdk/baseten')).createBaseten),

	// --- Tier 2 — cloud platforms ---
	'amazon-bedrock': async (config) => {
		const apiKey = await getApiKey('amazon-bedrock')
		const providerCfg = getProviderConfig('amazon-bedrock')
		const region = providerCfg.region
		if (!region) throw new Error('Amazon Bedrock region not configured. Set it in Settings.')
		const { createAmazonBedrock } = await import('@ai-sdk/amazon-bedrock')
		// biome-ignore lint/suspicious/noExplicitAny: provider options vary by auth mode
		const opts: any = { region }
		if (apiKey) {
			opts.apiKey = apiKey
		}
		const provider = createAmazonBedrock(opts)
		return provider(config.model)
	},

	'google-vertex': async (config) => {
		const apiKey = await getApiKey('google-vertex')
		const providerCfg = getProviderConfig('google-vertex')
		const { createVertex } = await import('@ai-sdk/google-vertex')
		// biome-ignore lint/suspicious/noExplicitAny: provider options vary by auth mode
		const opts: any = {}
		if (apiKey) opts.apiKey = apiKey
		if (providerCfg.project) opts.project = providerCfg.project
		if (providerCfg.location) opts.location = providerCfg.location
		const provider = createVertex(opts)
		return provider(config.model)
	},

	// --- Tier 3 — community / aggregators ---
	openrouter: async (config) => {
		const apiKey = await getApiKey('openrouter')
		if (!apiKey) throw new Error('No API key configured for provider: openrouter')
		const { createOpenRouter } = await import('@openrouter/ai-sdk-provider')
		const provider = createOpenRouter({ apiKey })
		return provider(config.model)
	},

	ollama: async (config) => {
		const providerCfg = getProviderConfig('ollama')
		const { createOllama } = await import('ollama-ai-provider-v2')
		const baseURL = providerCfg.baseURL || 'http://localhost:11434/api'
		const provider = createOllama({ baseURL })
		return provider(config.model)
	},

	'openai-compatible': async (config) => {
		const providerCfg = getProviderConfig('openai-compatible')
		const baseURL = providerCfg.baseURL
		if (!baseURL) throw new Error('OpenAI-Compatible base URL not configured. Set it in Settings.')
		const apiKey = await getApiKey('openai-compatible')
		const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible')
		// biome-ignore lint/suspicious/noExplicitAny: optional apiKey
		const opts: any = { name: providerCfg.name || 'custom', baseURL }
		if (apiKey) opts.apiKey = apiKey
		const provider = createOpenAICompatible(opts)
		return provider(config.model)
	},
}

export async function getProviderModel(config: HarnessConfig) {
	if (providerModelResolverForTests) {
		return providerModelResolverForTests(config)
	}

	const resolver = PROVIDER_RESOLVERS[config.provider]
	if (!resolver) {
		throw new Error(`Unsupported provider: ${config.provider}`)
	}

	return resolver(config)
}

/**
 * Resolve a UtilityLlmProfile to an AI SDK model instance.
 */
export async function getUtilityModel(profile: UtilityLlmProfile) {
	return getProviderModel({
		provider: profile.provider as Provider,
		model: profile.model,
		temperature: profile.temperature,
	})
}
