import type { Provider } from './schemas/agent-config.schema'

export type ProviderGroup = 'direct' | 'hosted' | 'platform' | 'local' | 'custom'

export interface ProviderConfigField {
	key: string
	label: string
	placeholder: string
	required: boolean
}

export interface ProviderMeta {
	id: Provider
	name: string
	group: ProviderGroup
	requiresKey: boolean
	configFields?: ProviderConfigField[]
}

export const PROVIDER_META: ProviderMeta[] = [
	// Direct — first-party API from the model maker
	{ id: 'openai', name: 'OpenAI', group: 'direct', requiresKey: true },
	{ id: 'anthropic', name: 'Anthropic', group: 'direct', requiresKey: true },
	{ id: 'google', name: 'Google', group: 'direct', requiresKey: true },
	{ id: 'xai', name: 'xAI', group: 'direct', requiresKey: true },
	{ id: 'mistral', name: 'Mistral', group: 'direct', requiresKey: true },
	{ id: 'deepseek', name: 'DeepSeek', group: 'direct', requiresKey: true },
	{ id: 'cohere', name: 'Cohere', group: 'direct', requiresKey: true },
	{ id: 'moonshotai', name: 'Moonshot AI', group: 'direct', requiresKey: true },
	{ id: 'alibaba', name: 'Alibaba (Qwen)', group: 'direct', requiresKey: true },

	// Hosted — third-party platforms hosting models (OpenRouter first)
	{ id: 'openrouter', name: 'OpenRouter', group: 'hosted', requiresKey: true },
	{ id: 'groq', name: 'Groq', group: 'hosted', requiresKey: true },
	{ id: 'togetherai', name: 'Together AI', group: 'hosted', requiresKey: true },
	{ id: 'fireworks', name: 'Fireworks', group: 'hosted', requiresKey: true },
	{ id: 'deepinfra', name: 'DeepInfra', group: 'hosted', requiresKey: true },
	{ id: 'cerebras', name: 'Cerebras', group: 'hosted', requiresKey: true },
	{ id: 'huggingface', name: 'Hugging Face', group: 'hosted', requiresKey: true },
	{ id: 'baseten', name: 'Baseten', group: 'hosted', requiresKey: true },

	// Platform — enterprise cloud with your own deployments
	{
		id: 'azure',
		name: 'Azure OpenAI',
		group: 'platform',
		requiresKey: true,
		configFields: [
			{
				key: 'resourceName',
				label: 'Resource Name',
				placeholder: 'my-openai-resource',
				required: true,
			},
		],
	},
	{
		id: 'amazon-bedrock',
		name: 'Amazon Bedrock',
		group: 'platform',
		requiresKey: true,
		configFields: [{ key: 'region', label: 'Region', placeholder: 'us-east-1', required: true }],
	},
	{
		id: 'google-vertex',
		name: 'Google Vertex AI',
		group: 'platform',
		requiresKey: true,
		configFields: [
			{ key: 'project', label: 'Project ID', placeholder: 'my-gcp-project', required: false },
			{ key: 'location', label: 'Location', placeholder: 'us-central1', required: false },
		],
	},

	// Local — run models on your machine
	{
		id: 'ollama',
		name: 'Ollama',
		group: 'local',
		requiresKey: false,
		configFields: [
			{
				key: 'baseURL',
				label: 'Base URL',
				placeholder: 'http://localhost:11434/api',
				required: false,
			},
		],
	},

	// Custom — bring your own endpoint
	{
		id: 'openai-compatible',
		name: 'OpenAI-Compatible',
		group: 'custom',
		requiresKey: false,
		configFields: [
			{
				key: 'baseURL',
				label: 'Base URL',
				placeholder: 'http://localhost:8000/v1',
				required: true,
			},
			{ key: 'name', label: 'Display Name', placeholder: 'My Server', required: false },
		],
	},
]

export const PROVIDER_GROUP_LABELS: Record<ProviderGroup, string> = {
	direct: 'Direct',
	hosted: 'Hosted',
	platform: 'Platform',
	local: 'Local',
	custom: 'Custom',
}
