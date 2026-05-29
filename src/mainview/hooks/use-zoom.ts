import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'app-zoom-factor'
const DEFAULT_ZOOM = 1
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0
const STEP = 0.1

function readZoom(): number {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			const val = Number.parseFloat(stored)
			if (!Number.isNaN(val) && val >= MIN_ZOOM && val <= MAX_ZOOM) return val
		}
	} catch {}
	return DEFAULT_ZOOM
}

function applyZoom(factor: number) {
	const root = document.getElementById('root')
	if (!root) return
	root.style.transformOrigin = '0 0'
	root.style.transform = factor === 1 ? '' : `scale(${factor})`
	root.style.width = factor === 1 ? '' : `${100 / factor}%`
	root.style.height = factor === 1 ? '' : `${100 / factor}%`
}

export function useZoom() {
	const [zoom, setZoomState] = useState(readZoom)

	const setZoom = useCallback((factor: number) => {
		const clamped = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, factor)) * 10) / 10
		setZoomState(clamped)
		localStorage.setItem(STORAGE_KEY, String(clamped))
		applyZoom(clamped)
	}, [])

	const zoomIn = useCallback(() => setZoom(readZoom() + STEP), [setZoom])
	const zoomOut = useCallback(() => setZoom(readZoom() - STEP), [setZoom])
	const resetZoom = useCallback(() => setZoom(DEFAULT_ZOOM), [setZoom])

	// Apply on mount
	useEffect(() => {
		applyZoom(readZoom())
	}, [])

	// Keyboard shortcuts: Cmd/Ctrl + / -
	useEffect(() => {
		function handler(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey
			if (!mod) return

			if (e.key === '=' || e.key === '+') {
				e.preventDefault()
				zoomIn()
			} else if (e.key === '-') {
				e.preventDefault()
				zoomOut()
			} else if (e.key === '0') {
				e.preventDefault()
				resetZoom()
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [zoomIn, zoomOut, resetZoom])

	return { zoom, setZoom, zoomIn, zoomOut, resetZoom, MIN_ZOOM, MAX_ZOOM, STEP }
}
