import { useColorModeValue } from '@/components/ui/color-mode'
import { Box } from '@chakra-ui/react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import AceEditor from 'react-ace'

import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/mode-text'
import 'ace-builds/src-noconflict/theme-tomorrow_night'
import 'ace-builds/src-noconflict/theme-tomorrow'
import 'ace-builds/src-noconflict/ext-language_tools'

export interface AceCompletion {
	caption: string
	value: string
	score: number
	meta: string
}

export interface CodeEditorProps {
	value: string
	onChange?: (value: string) => void
	mode?: 'json' | 'javascript' | 'text'
	readOnly?: boolean
	minLines?: number
	maxLines?: number
	placeholder?: string
	annotations?: Array<{
		row: number
		column: number
		type: 'error' | 'warning' | 'info'
		text: string
	}>
	showGutter?: boolean
	name?: string
	completions?: AceCompletion[]
}

export default function CodeEditor({
	value,
	onChange,
	mode = 'json',
	readOnly = false,
	minLines = 3,
	maxLines = 20,
	placeholder,
	annotations,
	showGutter,
	name,
	completions,
}: CodeEditorProps) {
	const fallbackId = useId()
	const editorName = name ?? `code-editor-${fallbackId}`
	const editorRef = useRef<AceEditor>(null)

	const aceTheme = useColorModeValue('tomorrow', 'tomorrow_night')

	const resolvedShowGutter = showGutter ?? !readOnly

	// Auto-validate JSON content
	const [jsonAnnotations, setJsonAnnotations] = useState<
		Array<{ row: number; column: number; type: 'error'; text: string }>
	>([])

	useEffect(() => {
		if (mode !== 'json' || readOnly || !value.trim()) {
			setJsonAnnotations([])
			return
		}
		const timer = setTimeout(() => {
			try {
				JSON.parse(value)
				setJsonAnnotations([])
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				// Try to extract line info from error message
				const posMatch = msg.match(/position\s+(\d+)/i)
				let row = 0
				let column = 0
				if (posMatch) {
					const pos = Number(posMatch[1])
					const lines = value.substring(0, pos).split('\n')
					row = Math.max(0, lines.length - 1)
					column = lines[lines.length - 1]?.length ?? 0
				}
				setJsonAnnotations([{ row, column, type: 'error', text: msg }])
			}
		}, 300)
		return () => clearTimeout(timer)
	}, [value, mode, readOnly])

	const mergedAnnotations = annotations ?? jsonAnnotations

	// Register custom completer when completions are provided
	const completionsRef = useRef(completions)
	completionsRef.current = completions

	useEffect(() => {
		if (!completions?.length) return
		const editor = editorRef.current?.editor
		if (!editor) return

		const completer = {
			getCompletions(
				_editor: unknown,
				_session: unknown,
				_pos: unknown,
				_prefix: unknown,
				callback: (err: null, results: AceCompletion[]) => void,
			) {
				callback(null, completionsRef.current ?? [])
			},
		}

		editor.completers = [completer]
		return () => {
			if (editor.completers) {
				editor.completers = editor.completers.filter((c: unknown) => c !== completer)
			}
		}
	}, [completions])

	const handleChange = useCallback(
		(newValue: string) => {
			onChange?.(newValue)
		},
		[onChange],
	)

	const editorStyle = useMemo(
		() => ({
			width: '100%',
			borderRadius: '6px',
		}),
		[],
	)

	const hasCompletions = !!completions?.length
	const setOptions = useMemo(
		() => ({
			useWorker: false,
			tabSize: 2,
			wrap: true,
			showPrintMargin: false,
			enableBasicAutocompletion: hasCompletions,
			enableLiveAutocompletion: hasCompletions,
		}),
		[hasCompletions],
	)

	return (
		<Box
			borderWidth="1px"
			borderColor="border"
			borderRadius="md"
			overflow="hidden"
			transition="border-color 0.2s"
			_focusWithin={{ borderColor: 'border.emphasized' }}
			css={{
				'& .ace_editor': {
					background: 'var(--chakra-colors-bg)',
					fontFamily: 'var(--chakra-fonts-mono)',
				},
				'& .ace_gutter': {
					background: 'var(--chakra-colors-bg-subtle)',
				},
			}}
		>
			<AceEditor
				ref={editorRef}
				name={editorName}
				mode={mode}
				theme={aceTheme}
				value={value}
				onChange={readOnly ? undefined : handleChange}
				readOnly={readOnly}
				placeholder={placeholder}
				minLines={minLines}
				maxLines={maxLines}
				fontSize={13}
				showGutter={resolvedShowGutter}
				highlightActiveLine={!readOnly}
				style={editorStyle}
				setOptions={setOptions}
				annotations={mergedAnnotations}
				editorProps={{ $blockScrolling: true }}
			/>
		</Box>
	)
}
