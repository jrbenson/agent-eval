import { Box, Button, Field, HStack, Input, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import { rpcRequest } from '../rpc'
import AppDialog, { AppDialogFooter } from './AppDialog'
import CodeEditor from './CodeEditor'
import FieldHeader from './FieldHeader'
import SchemaEditor, {
	type EditorNode,
	editorNodesToJsonSchema,
} from './schema-editor/SchemaEditor'

interface GenerateDataDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onApply: (json: string) => void
}

export default function GenerateDataDialog({
	open,
	onOpenChange,
	onApply,
}: GenerateDataDialogProps) {
	const [nodes, setNodes] = useState<EditorNode[]>([])
	const [count, setCount] = useState('1')
	const [seed, setSeed] = useState('')
	const [preview, setPreview] = useState('')
	const [generating, setGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout>>()

	const generate = useCallback(
		async (currentNodes: EditorNode[], currentCount: string, currentSeed: string) => {
			if (currentNodes.length === 0) {
				setPreview('')
				return
			}
			setGenerating(true)
			setError(null)
			try {
				const schema = editorNodesToJsonSchema(currentNodes)
				const opts: {
					schema: Record<string, unknown>
					count?: number
					seed?: number
				} = { schema }
				const c = Number.parseInt(currentCount, 10)
				if (c > 1) opts.count = c
				const s = Number.parseInt(currentSeed, 10)
				if (!Number.isNaN(s)) opts.seed = s

				const result = await rpcRequest.generateFakeData(opts)
				setPreview(JSON.stringify(result.data, null, 2))
			} catch (err) {
				setError(String(err))
				setPreview('')
			} finally {
				setGenerating(false)
			}
		},
		[],
	)

	// Auto-generate on schema/options change (debounced)
	useEffect(() => {
		if (!open) return
		clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			generate(nodes, count, seed)
		}, 400)
		return () => clearTimeout(debounceRef.current)
	}, [open, nodes, count, seed, generate])

	const handleApply = () => {
		if (nodes.length === 0) {
			setError('Output schema required. Define at least one property.')
			return
		}
		if (preview) {
			onApply(preview)
			onOpenChange(false)
		}
	}

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Generate Fake Data"
			size="lg"
			error={error}
			footer={
				<AppDialogFooter
					onCancel={() => onOpenChange(false)}
					onConfirm={handleApply}
					confirmLabel="Apply"
					confirmLoading={generating}
				/>
			}
		>
			<VStack gap={4} align="stretch">
				<Box>
					<FieldHeader
						label="Output Schema"
						description="Define the shape of data to generate."
						size="sm"
					/>
					<SchemaEditor nodes={nodes} onChange={setNodes} />
				</Box>

				<HStack gap={3}>
					<Field.Root flex={1}>
						<Field.Label fontSize="xs">Count</Field.Label>
						<Input
							size="sm"
							type="number"
							min={1}
							max={100}
							value={count}
							onChange={(e) => setCount(e.target.value)}
						/>
					</Field.Root>
					<Field.Root flex={1}>
						<Field.Label fontSize="xs">Seed (optional)</Field.Label>
						<Input
							size="sm"
							type="number"
							value={seed}
							onChange={(e) => setSeed(e.target.value)}
							placeholder="Random"
						/>
					</Field.Root>
				</HStack>

				{preview && (
					<Box>
						<FieldHeader
							label="Preview"
							size="sm"
							action={
								<Button
									size="xs"
									variant="outline"
									onClick={() => generate(nodes, count, seed)}
									loading={generating}
									disabled={nodes.length === 0}
								>
									<FiRefreshCw />
									Regenerate
								</Button>
							}
						/>
						<CodeEditor
							value={preview}
							mode="json"
							readOnly
							minLines={3}
							maxLines={20}
							name="fake-data-preview"
						/>
					</Box>
				)}
			</VStack>
		</AppDialog>
	)
}
