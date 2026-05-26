import {
	Badge,
	Box,
	Button,
	Collapsible,
	Field,
	HStack,
	IconButton,
	Input,
	List,
	NativeSelect,
	Popover,
	Spacer,
	Spinner,
	TagsInput,
	Text,
	VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	FiChevronDown,
	FiChevronRight,
	FiEye,
	FiEyeOff,
	FiFolder,
	FiRefreshCw,
	FiSave,
} from 'react-icons/fi'
import type { UtilityLlmProfile, UtilityLlmPurpose } from '../../shared/rpc-types'
import ListPageLayout from '../components/ListPageLayout'
import { SaveIndicator } from '../components/SaveIndicator'
import { SectionHeader } from '../components/SectionHeader'
import StatusIndicator from '../components/StatusIndicator'
import { InputGroup } from '../components/ui/input-group'
import { toaster } from '../components/ui/toaster'
import { type AutosaveStatus, useAutosave } from '../hooks/use-autosave'
import {
	useListModels,
	useProviderConfig,
	useProviderStatus,
	useSetApiKey,
	useSetProviderConfig,
	useSetUtilityLlmProfile,
	useUtilityLlmProfiles,
	useValidateApiKey,
} from '../hooks/use-configs'
import { rpcRequest } from '../rpc'

const PROVIDERS = [
	{ id: 'openai', name: 'OpenAI' },
	{ id: 'anthropic', name: 'Anthropic' },
	{ id: 'google', name: 'Google' },
	{ id: 'azure', name: 'Azure OpenAI' },
	{ id: 'xai', name: 'xAI' },
	{ id: 'groq', name: 'Groq' },
	{ id: 'mistral', name: 'Mistral' },
]

type KeyStatus = 'unvalidated' | 'valid' | 'invalid'

function KeyStatusIndicator({ status }: { status: KeyStatus | null }) {
	if (!status) return null
	const colorPalette = status === 'valid' ? 'green' : status === 'invalid' ? 'red' : 'yellow'
	const label = status === 'valid' ? 'Valid' : status === 'invalid' ? 'Invalid' : 'Checking...'
	return (
		<StatusIndicator colorPalette={colorPalette} fontSize="2xs" size="sm">
			{label}
		</StatusIndicator>
	)
}

function ModelsPopover({
	provider,
	isValid,
}: {
	provider: string
	isValid: boolean
}) {
	const { data: models, isLoading } = useListModels(provider, isValid)

	return (
		<Popover.Root positioning={{ placement: 'bottom-start' }} lazyMount>
			<Popover.Trigger asChild>
				<Button size="2xs" variant="ghost" fontSize="2xs" disabled={!isValid}>
					Models
				</Button>
			</Popover.Trigger>
			<Popover.Positioner>
				<Popover.Content maxH="300px" overflowY="auto">
					<Popover.CloseTrigger />
					<Popover.Header fontSize="sm" fontWeight="semibold">
						Available Models
					</Popover.Header>
					<Popover.Body>
						{isLoading ? (
							<Spinner size="sm" />
						) : !models || models.length === 0 ? (
							<Text fontSize="sm" color="fg.muted">
								No models found
							</Text>
						) : (
							<List.Root gap={1}>
								{models.map((m) => (
									<List.Item key={m} fontSize="xs" fontFamily="mono">
										{m}
									</List.Item>
								))}
							</List.Root>
						)}
					</Popover.Body>
				</Popover.Content>
			</Popover.Positioner>
		</Popover.Root>
	)
}

function AzureResourceField({
	onSave,
	onStatusChange,
}: {
	onSave: (resourceName: string) => Promise<void>
	onStatusChange?: (status: AutosaveStatus) => void
}) {
	const { data: config } = useProviderConfig('azure')
	const [resourceName, setResourceName] = useState(config?.resourceName ?? '')
	const hydratedRef = useRef(false)

	// Hydrate from server data once when it arrives.
	useEffect(() => {
		if (!hydratedRef.current && config?.resourceName) {
			setResourceName(config.resourceName)
			hydratedRef.current = true
		}
	}, [config?.resourceName])

	const dataSnapshot = JSON.stringify({ resourceName })
	useAutosave(
		dataSnapshot,
		async () => {
			if (!resourceName.trim()) return
			await onSave(resourceName.trim())
		},
		{ skip: !resourceName.trim(), onStatusChange },
	)

	return (
		<HStack mt={2} w="full" gap={2}>
			<Input
				flex="1"
				size="sm"
				placeholder="Azure resource name (e.g. my-openai-resource)"
				value={resourceName}
				onChange={(e) => setResourceName(e.target.value)}
			/>
		</HStack>
	)
}

function AzureModelsField({
	onSave,
}: {
	onSave: (models: string[]) => Promise<void>
}) {
	const { data: config } = useProviderConfig('azure')
	const rawModels = config?.models
	const savedModels: string[] = rawModels
		? (() => {
				try {
					const parsed = JSON.parse(rawModels)
					return Array.isArray(parsed) ? parsed : []
				} catch {
					return []
				}
			})()
		: []

	const handleChange = async (models: string[]) => {
		await onSave(models)
	}

	return (
		<Box mt={2}>
			<Text fontSize="xs" color="fg.muted" mb={1}>
				Deployment names (used for model selection in evaluations)
			</Text>
			<TagsInput.Root
				size="sm"
				value={savedModels}
				onValueChange={(details) => handleChange(details.value)}
			>
				<TagsInput.Control>
					<TagsInput.Items />
					<TagsInput.Input placeholder="Add deployment name..." />
				</TagsInput.Control>
			</TagsInput.Root>
		</Box>
	)
}

const UTILITY_LLM_PURPOSES: {
	key: UtilityLlmPurpose
	label: string
	description: string
	enabled: boolean
}[] = [
	{
		key: 'toolMock',
		label: 'Tool Mocking',
		description:
			'LLM used to generate realistic tool responses when a tool mock is set to LLM mode.',
		enabled: true,
	},
	{
		key: 'evaluation',
		label: 'Evaluation',
		description: 'LLM used to evaluate agent choices and performance after task completion.',
		enabled: false,
	},
	{
		key: 'summarization',
		label: 'Summarization',
		description: 'LLM used to create concise summaries of dense text.',
		enabled: false,
	},
	{
		key: 'generate',
		label: 'Generate',
		description:
			'LLM used to generate tool definitions, tool mocks, scenarios, and other elements from the UI.',
		enabled: true,
	},
	{
		key: 'simulation',
		label: 'Simulation',
		description: 'LLM used to generate simulated user prompts during multi-turn task evaluation.',
		enabled: true,
	},
]

function UtilityLlmProfileForm({
	purpose,
	profile,
	disabled,
	onStatusChange,
}: {
	purpose: UtilityLlmPurpose
	profile: UtilityLlmProfile | null
	disabled?: boolean
	onStatusChange?: (status: AutosaveStatus) => void
}) {
	const setProfile = useSetUtilityLlmProfile()
	const [provider, setProvider] = useState(profile?.provider ?? 'openai')
	const [model, setModel] = useState(profile?.model ?? '')
	const [temperature, setTemperature] = useState(profile?.temperature?.toString() ?? '0.5')
	const [maxTokens, setMaxTokens] = useState(profile?.maxTokens?.toString() ?? '')

	const { data: providerStatus } = useProviderStatus()
	const isProviderValid = useMemo(() => {
		if (!Array.isArray(providerStatus)) return false
		const ps = providerStatus.find((p) => p.provider === provider)
		return ps?.keyStatus === 'valid'
	}, [providerStatus, provider])

	const { data: models } = useListModels(provider, isProviderValid)

	const dataSnapshot = JSON.stringify({
		provider,
		model,
		temperature,
		maxTokens,
	})
	useAutosave(
		dataSnapshot,
		async () => {
			const p: UtilityLlmProfile = {
				provider,
				model: model.trim(),
				temperature: Number.parseFloat(temperature) || 0.5,
			}
			if (maxTokens.trim()) p.maxTokens = Number.parseInt(maxTokens, 10)
			await setProfile.mutateAsync({ purpose, profile: p })
		},
		{ skip: disabled || !model.trim(), onStatusChange },
	)

	return (
		<VStack gap={3} align="stretch" opacity={disabled ? 0.5 : 1}>
			<HStack gap={3}>
				<Field.Root flex={1}>
					<Field.Label fontSize="xs">Provider:</Field.Label>
					<NativeSelect.Root size="sm" disabled={disabled}>
						<NativeSelect.Field value={provider} onChange={(e) => setProvider(e.target.value)}>
							{PROVIDERS.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</NativeSelect.Field>
						<NativeSelect.Indicator />
					</NativeSelect.Root>
				</Field.Root>
				<Field.Root flex={1}>
					<Field.Label fontSize="xs">Model:</Field.Label>
					<Input
						size="sm"
						value={model}
						onChange={(e) => setModel(e.target.value)}
						placeholder={models && models.length > 0 ? models[0] : 'model name'}
						disabled={disabled}
						list={`models-${purpose}`}
					/>
					{models && models.length > 0 && (
						<datalist id={`models-${purpose}`}>
							{models.map((m) => (
								<option key={m} value={m} />
							))}
						</datalist>
					)}
				</Field.Root>
			</HStack>
			<HStack gap={3}>
				<Field.Root flex={1}>
					<Field.Label fontSize="xs">Temperature:</Field.Label>
					<Input
						size="sm"
						type="number"
						min={0}
						max={2}
						step={0.1}
						value={temperature}
						onChange={(e) => setTemperature(e.target.value)}
						disabled={disabled}
					/>
				</Field.Root>
				<Field.Root flex={1}>
					<Field.Label fontSize="xs">Max tokens:</Field.Label>
					<Input
						size="sm"
						type="number"
						min={1}
						value={maxTokens}
						onChange={(e) => setMaxTokens(e.target.value)}
						placeholder="Default"
						disabled={disabled}
					/>
				</Field.Root>
			</HStack>
		</VStack>
	)
}

function UtilityLlmSection({
	onStatusChange,
}: {
	onStatusChange: (status: AutosaveStatus) => void
}) {
	const { data: profiles } = useUtilityLlmProfiles()
	const [expanded, setExpanded] = useState<Record<string, boolean>>({
		toolMock: true,
	})

	const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

	return (
		<VStack gap={4} align="stretch">
			<SectionHeader
				title="Utility LLM"
				description="Configure LLM profiles for non-evaluation tasks."
			/>
			<VStack gap={3} align="stretch">
				{UTILITY_LLM_PURPOSES.map((p) => {
					const isOpen = expanded[p.key] ?? false
					const profile = profiles?.[p.key] ?? null
					return (
						<Box key={p.key}>
							<HStack cursor="pointer" onClick={() => toggle(p.key)} py={1} userSelect="none">
								<Box as={isOpen ? FiChevronDown : FiChevronRight} boxSize={4} color="fg.subtle" />
								<Text fontSize="sm" fontWeight="medium">
									{p.label}
								</Text>
								{!p.enabled && (
									<Badge size="sm" colorPalette="gray">
										Coming soon
									</Badge>
								)}
								{p.enabled && profile?.model && (
									<Badge size="sm" colorPalette="green" variant="subtle">
										{profile.provider}/{profile.model}
									</Badge>
								)}
							</HStack>
							<Collapsible.Root open={isOpen}>
								<Collapsible.Content>
									<Box pl={6} pt={2} pb={3}>
										<Text fontSize="xs" color="fg.muted" mb={3}>
											{p.description}
										</Text>
										<UtilityLlmProfileForm
											purpose={p.key}
											profile={profile}
											disabled={!p.enabled}
											onStatusChange={onStatusChange}
										/>
									</Box>
								</Collapsible.Content>
							</Collapsible.Root>
						</Box>
					)
				})}
			</VStack>
		</VStack>
	)
}

export default function SettingsPage() {
	const { data: providerStatus } = useProviderStatus()
	const setApiKey = useSetApiKey()
	const validateKey = useValidateApiKey()
	const setProviderConfig = useSetProviderConfig()
	const [keys, setKeys] = useState<Record<string, string>>({})
	const [showKey, setShowKey] = useState<Record<string, boolean>>({})
	const [saveStatus, setSaveStatus] = useState<AutosaveStatus>('idle')

	const statusMap = new Map<string, { isSet: boolean; keyStatus: KeyStatus | null }>()
	if (Array.isArray(providerStatus)) {
		for (const ps of providerStatus) {
			statusMap.set(ps.provider, {
				isSet: ps.isSet,
				keyStatus: ps.keyStatus as KeyStatus | null,
			})
		}
	}

	const handleSave = async (provider: string) => {
		const key = keys[provider]
		if (!key?.trim()) return
		try {
			await setApiKey.mutateAsync({ provider, apiKey: key.trim() })
			setKeys((prev) => ({ ...prev, [provider]: '' }))
			toaster.create({
				title: 'API key saved',
				description: `${provider} key is being validated...`,
				type: 'success',
				duration: 3000,
			})
		} catch {
			toaster.create({
				title: 'Failed to save API key',
				type: 'error',
				duration: 3000,
			})
		}
	}

	const handleRevalidate = async (provider: string) => {
		try {
			const result = await validateKey.mutateAsync(provider)
			toaster.create({
				title: result.valid ? 'Key is valid' : 'Key is invalid',
				type: result.valid ? 'success' : 'error',
				duration: 3000,
			})
		} catch {
			toaster.create({
				title: 'Validation failed',
				type: 'error',
				duration: 3000,
			})
		}
	}

	return (
		<ListPageLayout
			title="Settings"
			description="Manage API keys and provider configurations."
			actions={
				<HStack gap={2}>
					<SaveIndicator status={saveStatus} />
					<Button size="sm" variant="outline" onClick={() => rpcRequest.openDataDir({})}>
						<FiFolder />
						Data Folder
					</Button>
				</HStack>
			}
		>
			<VStack gap={10} align="stretch">
				{/* API key entry */}
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="API Keys"
						description="Enter keys for each provider you want to use."
					/>
					<VStack gap={4} align="stretch">
						{PROVIDERS.map((p) => {
							const info = statusMap.get(p.id)
							const isValid = info?.keyStatus === 'valid'

							return (
								<Field.Root key={p.id}>
									<Field.Label fontSize="sm" mb={1}>
										<HStack gap={2}>
											<Text>{p.name}</Text>
											<KeyStatusIndicator status={info?.keyStatus ?? null} />
											<Spacer />
											{info?.isSet && (
												<>
													<IconButton
														aria-label="Revalidate key"
														size="2xs"
														variant="ghost"
														onClick={() => handleRevalidate(p.id)}
														loading={validateKey.isPending}
													>
														<FiRefreshCw size={10} />
													</IconButton>
													<ModelsPopover provider={p.id} isValid={isValid} />
												</>
											)}
										</HStack>
									</Field.Label>
									<HStack w="full">
										<InputGroup
											flex="1"
											endElement={
												<Box
													as="button"
													onClick={() =>
														setShowKey((prev) => ({
															...prev,
															[p.id]: !prev[p.id],
														}))
													}
												>
													{showKey[p.id] ? <FiEyeOff size={14} /> : <FiEye size={14} />}
												</Box>
											}
										>
											<Input
												size="sm"
												type={showKey[p.id] ? 'text' : 'password'}
												placeholder={
													info?.isSet
														? '••••••••  (key already set, enter new to replace)'
														: `Enter ${p.name} API key`
												}
												value={keys[p.id] || ''}
												onChange={(e) =>
													setKeys((prev) => ({
														...prev,
														[p.id]: e.target.value,
													}))
												}
											/>
										</InputGroup>
										<Button
											size="sm"
											colorPalette="blue"
											variant="solid"
											onClick={() => handleSave(p.id)}
											loading={setApiKey.isPending}
											disabled={!keys[p.id]?.trim()}
										>
											<FiSave />
											Save
										</Button>
									</HStack>
									{p.id === 'azure' && (
										<AzureResourceField
											onSave={async (resourceName) => {
												await setProviderConfig.mutateAsync({
													provider: 'azure',
													config: { resourceName },
												})
											}}
											onStatusChange={setSaveStatus}
										/>
									)}
									{p.id === 'azure' && (
										<AzureModelsField
											onSave={async (models) => {
												await setProviderConfig.mutateAsync({
													provider: 'azure',
													config: { models: JSON.stringify(models) },
												})
											}}
										/>
									)}
								</Field.Root>
							)
						})}
					</VStack>
				</VStack>

				{/* Utility LLM profiles */}
				<UtilityLlmSection onStatusChange={setSaveStatus} />
			</VStack>
		</ListPageLayout>
	)
}
