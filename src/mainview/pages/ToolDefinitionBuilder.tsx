import {
	Box,
	Button,
	Card,
	Checkbox,
	Code,
	Field,
	Flex,
	HStack,
	IconButton,
	Input,
	NativeSelect,
	Spinner,
	Switch,
	TagsInput,
	Text,
	Textarea,
	VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	FiArrowDown,
	FiArrowUp,
	FiDatabase,
	FiPlus,
	FiSave,
	FiShare,
	FiTrash2,
	FiZap,
} from 'react-icons/fi'
import type {
	DefaultResponseType,
	LlmDefaultConfig,
	MockResponseRule,
	PersistenceOp,
} from '../../shared/schemas/tool-definition.schema'
import AppDialog from '../components/AppDialog'
import CodeEditor, { type AceCompletion } from '../components/CodeEditor'
import DrillInLayout from '../components/DrillInLayout'
import ExportDialog from '../components/ExportDialog'
import FieldHeader from '../components/FieldHeader'
import GenerateDataDialog from '../components/GenerateDataDialog'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import { SectionHeader } from '../components/SectionHeader'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import SchemaEditor, {
	type EditorNode,
	editorNodesToJsonSchema,
	jsonSchemaToEditorNodes,
} from '../components/schema-editor/SchemaEditor'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import {
	useCreateToolDefinition,
	useExportToolDefinition,
	useToolDefinition,
	useToolDefinitions,
	useUpdateToolDefinition,
} from '../hooks/use-tool-definitions'

interface ToolDefinitionBuilderProps {
	toolDefId?: string
	onBack: (newId?: string) => void
	onCreated?: (id: string) => void
	breadcrumbLabel?: string
}

export default function ToolDefinitionBuilder({
	toolDefId,
	onBack,
	onCreated,
	breadcrumbLabel = 'Tools',
}: ToolDefinitionBuilderProps) {
	const [schemaPreviewOpen, setSchemaPreviewOpen] = useState(false)
	const isEditing = !!toolDefId
	const { data: existing, isLoading } = useToolDefinition(toolDefId ?? null)
	const create = useCreateToolDefinition()
	const update = useUpdateToolDefinition()
	const exportTool = useExportToolDefinition()
	const { data: allDefs } = useToolDefinitions()

	const [exportOpen, setExportOpen] = useState(false)
	const [label, setLabel] = useState('')
	const [toolName, setToolName] = useState('')
	const [description, setDescription] = useState('')
	const [nodes, setNodes] = useState<EditorNode[]>([])
	const [defaultResponse, setDefaultResponse] = useState('')
	const [generateOpen, setGenerateOpen] = useState(false)
	const [generateMockOpen, setGenerateMockOpen] = useState(false)
	const [rules, setRules] = useState<
		{
			id: string
			condition: string
			response: string
			responseMode: 'static' | 'expression'
			persistenceOps: PersistenceOp[]
		}[]
	>([])
	const [core, setCore] = useState(false)
	const [keywords, setKeywords] = useState<string[]>([])
	const [generateTarget, setGenerateTarget] = useState<string | null>(null)
	const [defaultResponseType, setDefaultResponseType] = useState<DefaultResponseType>('static')
	const [defaultResponseMode, setDefaultResponseMode] = useState<'static' | 'expression'>('static')
	const [referenceData, setReferenceData] = useState('')
	const [outputSchemaNodes, setOutputSchemaNodes] = useState<EditorNode[]>([])
	const [systemPromptAddendum, setSystemPromptAddendum] = useState('')
	const [promptPrefix, setPromptPrefix] = useState('')
	const [persistenceEnabled, setPersistenceEnabled] = useState(false)
	const [persistenceHint, setPersistenceHint] = useState('')

	// Build autocomplete entries from parameter schema nodes
	const expressionCompletions = useMemo<AceCompletion[]>(() => {
		const items: AceCompletion[] = [
			{ caption: 'input', value: 'input', score: 1000, meta: 'object' },
			{ caption: 'toolName', value: 'toolName', score: 999, meta: 'variable' },
		]
		function walk(nodeList: EditorNode[], prefix: string, score: number) {
			for (const node of nodeList) {
				if (!node.name.trim()) continue
				const path = `${prefix}.${node.name}`
				items.push({ caption: path, value: path, score, meta: node.type })
				if (node.type === 'object' && node.properties) {
					walk(node.properties, path, score - 1)
				}
			}
		}
		walk(nodes, 'input', 998)
		return items
	}, [nodes])

	// Helpers to reduce repetitive rule/op update patterns
	const updateRule = useCallback(
		(idx: number, patch: Partial<(typeof rules)[number]>) =>
			setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))),
		[],
	)
	const updateOp = useCallback(
		(ruleIdx: number, opIdx: number, patch: Partial<PersistenceOp>) =>
			setRules((prev) =>
				prev.map((r, i) => {
					if (i !== ruleIdx) return r
					const ops = r.persistenceOps.map((op, j) => (j === opIdx ? { ...op, ...patch } : op))
					return { ...r, persistenceOps: ops }
				}),
			),
		[],
	)

	const onPopulate = useCallback(
		(e: {
			label?: string
			name: string
			description: string
			parameters: Record<string, unknown>
			mockResponse: {
				defaultResponseType?: DefaultResponseType
				defaultResponse: unknown
				defaultResponseMode?: 'static' | 'expression'
				rules: {
					id: string
					condition: string
					response: unknown
					responseMode?: 'static' | 'expression'
					persistenceOps?: PersistenceOp[]
				}[]
				llmDefaultConfig?: LlmDefaultConfig
			}
			core?: boolean
			keywords?: string[]
		}) => {
			setLabel(e.label ?? e.name)
			setToolName(e.name)
			setDescription(e.description)
			setCore(e.core ?? false)
			setKeywords(e.keywords ?? [])
			setNodes(jsonSchemaToEditorNodes(e.parameters))
			const defaultResp = e.mockResponse?.defaultResponse ?? { success: true }
			setDefaultResponse(
				typeof defaultResp === 'string' ? defaultResp : JSON.stringify(defaultResp, null, 2),
			)
			setRules(
				(e.mockResponse?.rules ?? []).map((r) => ({
					id: r.id,
					condition: r.condition,
					response:
						typeof r.response === 'string' ? r.response : JSON.stringify(r.response, null, 2),
					responseMode: r.responseMode ?? 'static',
					persistenceOps: r.persistenceOps ?? [],
				})),
			)

			// LLM default config
			setDefaultResponseType(e.mockResponse?.defaultResponseType ?? 'static')
			setDefaultResponseMode(e.mockResponse?.defaultResponseMode ?? 'static')
			const llm = e.mockResponse?.llmDefaultConfig
			if (llm) {
				setReferenceData(llm.referenceData ?? '')
				setSystemPromptAddendum(llm.systemPromptAddendum ?? '')
				setPromptPrefix(llm.promptPrefix ?? '')
				setPersistenceEnabled(llm.persistenceEnabled ?? false)
				setPersistenceHint(llm.persistenceHint ?? '')
				if (llm.outputSchema) {
					setOutputSchemaNodes(jsonSchemaToEditorNodes(llm.outputSchema))
				} else {
					setOutputSchemaNodes([])
				}
			}
		},
		[],
	)

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing,
		allEntities: allDefs,
		entityType: 'Tool',
		nameExtractor: (d: { label: string }) => d.label,
		onPopulate,
		setName: setLabel,
	})

	// Dirty-guard setup
	const stateJson = useMemo(
		() =>
			JSON.stringify({
				label,
				toolName,
				description,
				nodes,
				defaultResponse,
				defaultResponseMode,
				rules,
				core,
				keywords,
				defaultResponseType,
				referenceData,
				outputSchemaNodes,
				systemPromptAddendum,
				promptPrefix,
				persistenceEnabled,
				persistenceHint,
			}),
		[
			label,
			toolName,
			description,
			nodes,
			defaultResponse,
			defaultResponseMode,
			rules,
			core,
			keywords,
			defaultResponseType,
			referenceData,
			outputSchemaNodes,
			systemPromptAddendum,
			promptPrefix,
			persistenceEnabled,
			persistenceHint,
		],
	)
	const dirtyGuard = useDirtyGuard(stateJson)
	useNavigationGuard(dirtyGuard.navGuard)
	useEffect(() => {
		if (ready) dirtyGuard.markClean()
	}, [ready, dirtyGuard.markClean])

	const handleSave = async () => {
		if (!toolName.trim()) {
			toaster.create({ title: 'Tool name is required', type: 'warning' })
			return
		}
		if (!description.trim()) {
			toaster.create({ title: 'Description is required', type: 'warning' })
			return
		}

		let parsedDefault: unknown
		try {
			parsedDefault = JSON.parse(defaultResponse)
		} catch {
			parsedDefault = defaultResponse
		}

		const parsedRules: MockResponseRule[] = []
		for (const rule of rules) {
			let parsedResponse: unknown
			try {
				parsedResponse = JSON.parse(rule.response)
			} catch {
				parsedResponse = rule.response
			}
			const cleanOps = rule.persistenceOps.map((op) => {
				const clean: PersistenceOp = {
					key: op.key,
					mode: op.mode,
					content: op.content,
				}
				if (op.keyMode && op.keyMode !== 'static') clean.keyMode = op.keyMode
				if (op.contentMode && op.contentMode !== 'static') clean.contentMode = op.contentMode
				return clean
			})
			parsedRules.push({
				id: rule.id,
				condition: rule.condition,
				response: parsedResponse,
				...(rule.responseMode !== 'static' ? { responseMode: rule.responseMode } : {}),
				...(cleanOps.length > 0 ? { persistenceOps: cleanOps } : {}),
			})
		}

		const llmDefaultConfig: LlmDefaultConfig | undefined =
			defaultResponseType === 'llm'
				? {
						referenceData,
						...(outputSchemaNodes.length > 0
							? { outputSchema: editorNodesToJsonSchema(outputSchemaNodes) }
							: {}),
						...(systemPromptAddendum.trim()
							? { systemPromptAddendum: systemPromptAddendum.trim() }
							: {}),
						...(promptPrefix.trim() ? { promptPrefix: promptPrefix.trim() } : {}),
						...(persistenceEnabled ? { persistenceEnabled: true } : {}),
						...(persistenceEnabled && persistenceHint.trim()
							? { persistenceHint: persistenceHint.trim() }
							: {}),
					}
				: undefined

		const payload = {
			label: label.trim() || toolName.trim(),
			name: toolName.trim(),
			description: description.trim(),
			parameters: editorNodesToJsonSchema(nodes),
			mockResponse: {
				defaultResponseType,
				defaultResponse: parsedDefault,
				...(defaultResponseMode !== 'static' ? { defaultResponseMode } : {}),
				rules: parsedRules,
				...(llmDefaultConfig ? { llmDefaultConfig } : {}),
			},
			core,
			...(keywords.length > 0 ? { keywords } : {}),
		}

		try {
			if (isEditing && toolDefId) {
				await update.mutateAsync({ id: toolDefId, ...payload })
				dirtyGuard.markClean()
				toaster.create({ title: 'Saved', type: 'success' })
			} else {
				const result = await create.mutateAsync(payload)
				dirtyGuard.markClean()
				toaster.create({ title: 'Created', type: 'success' })
				onCreated?.(result.id)
			}
		} catch (err) {
			toaster.create({
				title: 'Save failed',
				description: String(err),
				type: 'error',
			})
		}
	}

	dirtyGuard.saveRef.current = handleSave

	const handleExport = (includeMockBehavior: boolean) => {
		if (!toolDefId) return
		exportTool.mutate(
			{ id: toolDefId, includeMockBehavior },
			{
				onSuccess: ({ json }) => {
					const blob = new Blob([json], { type: 'application/json' })
					const url = URL.createObjectURL(blob)
					const a = document.createElement('a')
					a.href = url
					a.download = `${toolName || 'tool'}.json`
					a.click()
					URL.revokeObjectURL(url)
					setExportOpen(false)
					toaster.create({ type: 'success', description: 'Exported' })
				},
			},
		)
	}

	if (isEditing && isLoading) {
		return (
			<DrillInLayout
				title="Loading..."
				breadcrumbs={[
					{
						label: breadcrumbLabel,
						onClick: () => dirtyGuard.guardNavigation(onBack),
					},
				]}
			>
				<Flex justify="center" py={8}>
					<Spinner />
				</Flex>
			</DrillInLayout>
		)
	}

	const previewSchema = editorNodesToJsonSchema(nodes)

	return (
		<DrillInLayout
			title={label || 'Untitled Tool'}
			onTitleChange={setLabel}
			breadcrumbs={[
				{
					label: breadcrumbLabel,
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="toolDefinition"
					entityId={toolDefId}
					guardNavigation={dirtyGuard.guardNavigation}
					onAfterPopout={onBack}
				/>
			}
			actions={
				<HStack gap={2}>
					<Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
						<FiZap />
						Generate
					</Button>
					{isEditing && (
						<Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
							<FiShare />
							Export
						</Button>
					)}
					<Button
						size="sm"
						variant="outline"
						onClick={handleSave}
						loading={create.isPending || update.isPending}
					>
						<FiSave />
						Save
					</Button>
				</HStack>
			}
		>
			<VStack gap={10} align="stretch">
				{/* Tool Metadata */}
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Tool Metadata"
						description="Identity and discoverability settings for this tool definition."
					/>
					<Field.Root required>
						<Field.Label>Tool name:</Field.Label>
						<Input
							size="sm"
							value={toolName}
							onChange={(e) => setToolName(e.target.value)}
							placeholder="get_weather"
							fontFamily="mono"
							autoCapitalize="off"
							autoCorrect="off"
							spellCheck={false}
						/>
					</Field.Root>
					<Field.Root required>
						<Field.Label>Description:</Field.Label>
						<Textarea
							size="sm"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What this tool does..."
							rows={2}
						/>
					</Field.Root>
					<Checkbox.Root checked={core} onCheckedChange={(e) => setCore(!!e.checked)}>
						<Checkbox.HiddenInput />
						<Checkbox.Control>
							<Checkbox.Indicator />
						</Checkbox.Control>
						<Checkbox.Label>Core (always available when tool search is enabled)</Checkbox.Label>
					</Checkbox.Root>
					<Field.Root>
						<Field.Label>Keywords:</Field.Label>
						<TagsInput.Root
							size="sm"
							value={keywords}
							onValueChange={(details) => setKeywords(details.value)}
							blurBehavior="add"
							delimiter=","
							validate={(e) => {
								const trimmed = e.inputValue.trim()
								return trimmed.length > 0 && !keywords.includes(trimmed)
							}}
						>
							<TagsInput.Control>
								<TagsInput.Items />
								<TagsInput.Input placeholder="Add keyword…" fontSize="xs" />
							</TagsInput.Control>
						</TagsInput.Root>
						<Field.HelperText fontSize="xs">
							Extra terms for tool search matching (2× weight vs description)
						</Field.HelperText>
					</Field.Root>
				</VStack>

				{/* Parameters */}
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Parameters"
						description="Define the expected input schema for this tool."
						actions={
							<Button size="xs" variant="outline" onClick={() => setSchemaPreviewOpen(true)}>
								Schema
							</Button>
						}
					/>
					<SchemaEditor nodes={nodes} onChange={setNodes} />
				</VStack>

				{/* Schema Preview Dialog */}
				<AppDialog
					open={schemaPreviewOpen}
					onOpenChange={setSchemaPreviewOpen}
					title="Schema Preview"
					size="lg"
				>
					<CodeEditor
						value={JSON.stringify(previewSchema, null, 2)}
						mode="json"
						readOnly
						showGutter={false}
						minLines={5}
						maxLines={30}
						name="schema-preview"
					/>
				</AppDialog>

				{/* Mock Response */}
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Mock Response"
						description="Rules evaluated top-to-bottom; first match wins. Default used when no rules match."
						actions={
							<HStack gap={1}>
								<Button size="xs" variant="outline" onClick={() => setGenerateMockOpen(true)}>
									<FiZap />
									Generate
								</Button>
								<Button
									size="xs"
									variant="outline"
									onClick={() =>
										setRules([
											...rules,
											{
												id: crypto.randomUUID(),
												condition: '',
												response: '{ "result": "matched" }',
												responseMode: 'static' as const,
												persistenceOps: [],
											},
										])
									}
								>
									<FiPlus />
									Add Rule
								</Button>
							</HStack>
						}
					/>
					<Text fontSize="xs" color="fg.subtle">
						Use <Code fontSize="xs">input</Code>, <Code fontSize="xs">toolName</Code>, and{' '}
						<Code fontSize="xs">store</Code> (persistence Map) in conditions.
					</Text>

					{rules.map((rule, idx) => (
						<Card.Root key={rule.id} variant="outline" size="sm">
							<Card.Body>
								<VStack gap={4} align="stretch">
									<HStack gap={1}>
										<Text fontSize="sm" fontWeight="medium" color="fg.muted">
											Rule {idx + 1}
										</Text>
										<IconButton
											aria-label="Move up"
											size="xs"
											variant="ghost"
											disabled={idx === 0}
											onClick={() => {
												const updated = [...rules]
												;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
												setRules(updated)
											}}
										>
											<FiArrowUp />
										</IconButton>
										<IconButton
											aria-label="Move down"
											size="xs"
											variant="ghost"
											disabled={idx === rules.length - 1}
											onClick={() => {
												const updated = [...rules]
												;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
												setRules(updated)
											}}
										>
											<FiArrowDown />
										</IconButton>
										<IconButton
											aria-label="Remove rule"
											size="xs"
											variant="ghost"
											colorPalette="red"
											onClick={() => setRules(rules.filter((_, i) => i !== idx))}
										>
											<FiTrash2 />
										</IconButton>
									</HStack>
									<Box>
										{/* Condition */}
										<FieldHeader label="Condition:" />
										<CodeEditor
											value={rule.condition}
											onChange={(val) => updateRule(idx, { condition: val })}
											mode="javascript"
											minLines={1}
											maxLines={3}
											showGutter={false}
											placeholder='input.city === "Paris"'
											name={`rule-condition-${rule.id}`}
											completions={expressionCompletions}
										/>
									</Box>
									<Box>
										<FieldHeader
											label="Response body:"
											action={
												<HStack gap={2}>
													<Button
														size="2xs"
														variant="ghost"
														onClick={() => setGenerateTarget(`rule-${rule.id}`)}
													>
														<FiDatabase />
														Generate Data
													</Button>
													<HStack gap={1}>
														<Text fontSize="2xs" color="fg.muted">
															Expression
														</Text>
														<Switch.Root
															size="sm"
															checked={rule.responseMode === 'expression'}
															onCheckedChange={(e) =>
																updateRule(idx, {
																	responseMode: e.checked ? 'expression' : 'static',
																})
															}
														>
															<Switch.HiddenInput />
															<Switch.Control />
														</Switch.Root>
													</HStack>
												</HStack>
											}
										/>
										<CodeEditor
											value={rule.response}
											onChange={(val) => updateRule(idx, { response: val })}
											mode={rule.responseMode === 'expression' ? 'javascript' : 'json'}
											minLines={2}
											maxLines={10}
											name={`rule-response-${rule.id}`}
											completions={expressionCompletions}
										/>
										{rule.responseMode === 'expression' && (
											<Text fontSize="xs" color="fg.muted" mt={1}>
												Use <Code fontSize="xs">input</Code>, <Code fontSize="xs">toolName</Code>,
												and <Code fontSize="xs">store</Code> (persistence Map) in expressions.
											</Text>
										)}
									</Box>

									{/* Persistence Operations */}
									<VStack gap={2} align="stretch">
										<FieldHeader
											label="Persistence operations:"
											size="xs"
											action={
												<Button
													size="2xs"
													variant="ghost"
													onClick={() =>
														updateRule(idx, {
															persistenceOps: [
																...rule.persistenceOps,
																{
																	key: '',
																	mode: 'replace' as const,
																	content: '',
																},
															],
														})
													}
												>
													<FiPlus />
													Add Operation
												</Button>
											}
										/>
										{rule.persistenceOps.map((op, opIdx) => (
											<Box
												key={`${rule.id}-op-${opIdx}`}
												borderLeft="3px solid"
												borderColor="border.emphasized"
												pl={3}
												mt={1}
											>
												<VStack gap={2} align="stretch">
													<HStack gap={2}>
														<Text fontSize="xs" fontWeight="medium" color="fg.muted">
															Operation {opIdx + 1}
														</Text>
														<NativeSelect.Root size="sm" width="auto">
															<NativeSelect.Field
																value={op.mode}
																onChange={(e) =>
																	updateOp(idx, opIdx, {
																		mode: e.target.value as 'replace' | 'append' | 'prepend',
																	})
																}
															>
																<option value="replace">replace</option>
																<option value="append">append</option>
																<option value="prepend">prepend</option>
															</NativeSelect.Field>
															<NativeSelect.Indicator />
														</NativeSelect.Root>
														<IconButton
															aria-label="Remove operation"
															size="xs"
															variant="ghost"
															colorPalette="red"
															onClick={() =>
																updateRule(idx, {
																	persistenceOps: rule.persistenceOps.filter((_, i) => i !== opIdx),
																})
															}
														>
															<FiTrash2 />
														</IconButton>
													</HStack>
													<Box>
														<FieldHeader
															label="Key:"
															size="xs"
															action={
																<HStack gap={1}>
																	<Text fontSize="2xs" color="fg.muted">
																		Expression
																	</Text>
																	<Switch.Root
																		size="sm"
																		checked={op.keyMode === 'expression'}
																		onCheckedChange={(e) =>
																			updateOp(idx, opIdx, {
																				keyMode: e.checked ? 'expression' : 'static',
																			})
																		}
																	>
																		<Switch.HiddenInput />
																		<Switch.Control />
																	</Switch.Root>
																</HStack>
															}
														/>
														<CodeEditor
															value={op.key}
															onChange={(val) => updateOp(idx, opIdx, { key: val })}
															mode={op.keyMode === 'expression' ? 'javascript' : 'text'}
															minLines={1}
															maxLines={3}
															showGutter={false}
															placeholder={
																op.keyMode === 'expression' ? '`key-${input.id}`' : 'mykey'
															}
															name={`rule-${rule.id}-op-${opIdx}-key`}
															completions={
																op.keyMode === 'expression' ? expressionCompletions : undefined
															}
														/>
													</Box>
													<Box>
														<FieldHeader
															label="Content:"
															size="xs"
															action={
																<HStack gap={1}>
																	<Text fontSize="2xs" color="fg.muted">
																		Expression
																	</Text>
																	<Switch.Root
																		size="sm"
																		checked={op.contentMode === 'expression'}
																		onCheckedChange={(e) =>
																			updateOp(idx, opIdx, {
																				contentMode: e.checked ? 'expression' : 'static',
																			})
																		}
																	>
																		<Switch.HiddenInput />
																		<Switch.Control />
																	</Switch.Root>
																</HStack>
															}
														/>
														<CodeEditor
															value={op.content}
															onChange={(val) => updateOp(idx, opIdx, { content: val })}
															mode={op.contentMode === 'expression' ? 'javascript' : 'text'}
															minLines={1}
															maxLines={5}
															showGutter={false}
															placeholder={
																op.contentMode === 'expression'
																	? '`some content ${input.value}`'
																	: 'some content'
															}
															name={`rule-${rule.id}-op-${opIdx}-content`}
															completions={
																op.contentMode === 'expression' ? expressionCompletions : undefined
															}
														/>
													</Box>
												</VStack>
											</Box>
										))}
									</VStack>
								</VStack>
							</Card.Body>
						</Card.Root>
					))}

					{/* Default response — always shown last */}
					<Card.Root variant="outline" size="sm">
						<Card.Body>
							<VStack gap={2} align="stretch">
								<HStack my={2} gap={2}>
									<Text fontSize="sm" fontWeight="medium" color="fg.muted">
										Default
									</Text>
									<HStack gap={1}>
										<Button
											size="2xs"
											variant={defaultResponseType === 'static' ? 'solid' : 'ghost'}
											onClick={() => setDefaultResponseType('static')}
										>
											Static
										</Button>
										<Button
											size="2xs"
											variant={defaultResponseType === 'llm' ? 'solid' : 'ghost'}
											onClick={() => setDefaultResponseType('llm')}
										>
											LLM
										</Button>
									</HStack>
								</HStack>

								{defaultResponseType === 'static' ? (
									<>
										<FieldHeader
											label="Response body:"
											action={
												<HStack gap={2}>
													<Button
														size="2xs"
														variant="ghost"
														onClick={() => setGenerateTarget('default')}
													>
														<FiDatabase />
														Generate Data
													</Button>
													<HStack gap={1}>
														<Text fontSize="2xs" color="fg.muted">
															Expression
														</Text>
														<Switch.Root
															size="sm"
															checked={defaultResponseMode === 'expression'}
															onCheckedChange={(e) =>
																setDefaultResponseMode(e.checked ? 'expression' : 'static')
															}
														>
															<Switch.HiddenInput />
															<Switch.Control />
														</Switch.Root>
													</HStack>
												</HStack>
											}
										/>
										<CodeEditor
											value={defaultResponse}
											onChange={setDefaultResponse}
											mode={defaultResponseMode === 'expression' ? 'javascript' : 'json'}
											placeholder="Default response JSON..."
											minLines={3}
											maxLines={15}
											name="default-response"
											completions={expressionCompletions}
										/>
										{defaultResponseMode === 'expression' && (
											<Text fontSize="xs" color="fg.muted" mt={1}>
												Use <Code fontSize="xs">input</Code>, <Code fontSize="xs">toolName</Code>,
												and <Code fontSize="xs">store</Code> (persistence Map) in expressions.
											</Text>
										)}
									</>
								) : (
									<VStack gap={3} align="stretch">
										<Box>
											<FieldHeader
												label="Output schema:"
												description="Define properties to constrain LLM response shape. Leave empty for free-form text."
											/>
											<SchemaEditor nodes={outputSchemaNodes} onChange={setOutputSchemaNodes} />
										</Box>

										<Box>
											<FieldHeader
												label="Reference data:"
												description="Context the LLM will use to generate responses (markdown, JSON, CSV, etc.)"
												action={
													<Button
														size="2xs"
														variant="ghost"
														onClick={() => setGenerateTarget('referenceData')}
													>
														<FiDatabase />
														Generate Data
													</Button>
												}
											/>
											<CodeEditor
												value={referenceData}
												onChange={setReferenceData}
												mode="text"
												placeholder="Paste reference data here..."
												minLines={4}
												maxLines={12}
												name="reference-data"
											/>
										</Box>

										<Field.Root>
											<FieldHeader
												label="System prompt suffix:"
												description="Appended to the built-in mock system prompt. Use this to describe error conditions, edge cases, or response style."
												asFieldLabel
											/>
											<Textarea
												size="sm"
												value={systemPromptAddendum}
												onChange={(e) => setSystemPromptAddendum(e.target.value)}
												placeholder="e.g., If the city is not in the reference data, return a 404 error..."
												rows={3}
											/>
										</Field.Root>

										<Field.Root>
											<FieldHeader
												label="User prompt prefix:"
												description="Prepended to the tool input description sent to the LLM."
												asFieldLabel
											/>
											<Textarea
												size="sm"
												value={promptPrefix}
												onChange={(e) => setPromptPrefix(e.target.value)}
												placeholder="e.g., This is a weather API call for..."
												rows={2}
											/>
										</Field.Root>

										<Box borderTopWidth="1px" borderColor="border.muted" pt={3} mt={1}>
											<Checkbox.Root
												checked={persistenceEnabled}
												onCheckedChange={(e) => setPersistenceEnabled(!!e.checked)}
											>
												<Checkbox.HiddenInput />
												<Checkbox.Control />
												<Checkbox.Label fontSize="sm">Enable Persistence</Checkbox.Label>
											</Checkbox.Root>
											<Text fontSize="xs" color="fg.muted" mt={1}>
												When enabled, the mock LLM receives persistence tools
												(read/write/append/list) to interact with trial-scoped state.
											</Text>
											{persistenceEnabled && (
												<Field.Root mt={2}>
													<FieldHeader
														label="Persistence hint:"
														description="Describes expected keys/patterns to the LLM, reducing unnecessary list calls."
														asFieldLabel
													/>
													<Textarea
														size="sm"
														value={persistenceHint}
														onChange={(e) => setPersistenceHint(e.target.value)}
														placeholder='e.g., Keys are file paths like "todo.md", "notes.txt".'
														rows={2}
													/>
												</Field.Root>
											)}
										</Box>
									</VStack>
								)}
							</VStack>
						</Card.Body>
					</Card.Root>
				</VStack>
			</VStack>

			{/* Generate Data Dialog */}
			<GenerateDataDialog
				open={generateTarget !== null}
				onOpenChange={(open) => {
					if (!open) setGenerateTarget(null)
				}}
				onApply={(json) => {
					if (generateTarget === 'default') {
						setDefaultResponse(json)
					} else if (generateTarget === 'referenceData') {
						setReferenceData(json)
					} else if (generateTarget?.startsWith('rule-')) {
						const ruleId = generateTarget.slice(5)
						setRules(rules.map((r) => (r.id === ruleId ? { ...r, response: json } : r)))
					}
					setGenerateTarget(null)
				}}
			/>
			<UnsavedChangesDialog
				open={dirtyGuard.showDialog}
				onSave={dirtyGuard.handleDialogSave}
				onDiscard={dirtyGuard.handleDiscard}
				onCancel={dirtyGuard.handleCancel}
				saving={create.isPending || update.isPending}
			/>
			<ExportDialog
				open={exportOpen}
				onOpenChange={setExportOpen}
				entityName={label || toolName || 'Tool'}
				onExport={handleExport}
				exporting={exportTool.isPending}
			/>
			<GenerateElementDialog
				open={generateOpen}
				onOpenChange={setGenerateOpen}
				entityType="toolDefinition"
				existingData={{
					label,
					name: toolName,
					description,
					parameters: editorNodesToJsonSchema(nodes),
					core,
					keywords,
				}}
				onApply={(result) => {
					if (result.label) setLabel(result.label as string)
					if (result.name) setToolName(result.name as string)
					if (result.description) setDescription(result.description as string)
					if (result.parameters)
						setNodes(jsonSchemaToEditorNodes(result.parameters as Record<string, unknown>))
					if (result.core !== undefined) setCore(result.core as boolean)
					if (result.keywords) setKeywords(result.keywords as string[])
					if (result.mockResponse && typeof result.mockResponse === 'object') {
						const mock = result.mockResponse as Record<string, unknown>
						if (mock.defaultResponseType)
							setDefaultResponseType(mock.defaultResponseType as DefaultResponseType)
						if (mock.defaultResponse !== undefined) {
							setDefaultResponse(
								typeof mock.defaultResponse === 'string'
									? mock.defaultResponse
									: JSON.stringify(mock.defaultResponse, null, 2),
							)
						}
						if (mock.rules && Array.isArray(mock.rules)) {
							setRules(
								(
									mock.rules as Array<{
										id: string
										condition: string
										response: unknown
									}>
								).map((r) => ({
									id: r.id,
									condition: r.condition,
									response:
										typeof r.response === 'string'
											? r.response
											: JSON.stringify(r.response, null, 2),
									responseMode: 'static' as const,
									persistenceOps: [],
								})),
							)
						}
					}
				}}
			/>
			<GenerateElementDialog
				open={generateMockOpen}
				onOpenChange={setGenerateMockOpen}
				entityType="toolMockResponse"
				existingData={{
					toolName,
					toolDescription: description,
					toolParameters: editorNodesToJsonSchema(nodes),
					mockResponse: {
						defaultResponseType,
						defaultResponse,
						rules,
					},
				}}
				onApply={(result) => {
					if (result.defaultResponseType)
						setDefaultResponseType(result.defaultResponseType as DefaultResponseType)
					if (result.defaultResponse !== undefined) {
						setDefaultResponse(
							typeof result.defaultResponse === 'string'
								? result.defaultResponse
								: JSON.stringify(result.defaultResponse, null, 2),
						)
					}
					if (result.rules && Array.isArray(result.rules)) {
						setRules(
							(
								result.rules as Array<{
									id: string
									condition: string
									response: unknown
									responseMode?: string
								}>
							).map((r) => ({
								id: r.id || crypto.randomUUID(),
								condition: r.condition,
								response:
									typeof r.response === 'string' ? r.response : JSON.stringify(r.response, null, 2),
								responseMode: (r.responseMode as 'static' | 'expression') ?? 'static',
								persistenceOps: [],
							})),
						)
					}
				}}
			/>
		</DrillInLayout>
	)
}
