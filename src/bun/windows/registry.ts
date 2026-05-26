import { BrowserWindow } from 'electrobun/bun'
import { resolveMainViewUrl } from '../app/resolve-view-url'
import type { RpcFactory } from '../rpc/create-rpc'
import { resolveEntityLabel } from './label-resolver'

type WindowRpc = {
	send: Record<string, (payload: unknown) => void>
	request: {
		checkDirtyState: (payload: Record<string, never>) => Promise<{ isDirty: boolean }>
		resolveCloseGuard: (payload: Record<string, never>) => Promise<{ action: string }>
	}
}

export type PopoutEntry = {
	win: BrowserWindow
	entityType: string
	entityId: string
}

const popouts = new Map<number, PopoutEntry>()

let mainWindowRef: BrowserWindow | null = null
let createRpcRef: RpcFactory | null = null
let popoutCounter = 0

export function initRegistry(mainWindow: BrowserWindow, createRpc: RpcFactory) {
	mainWindowRef = mainWindow
	createRpcRef = createRpc
}

export async function openPopout(entityType: string, entityId: string): Promise<number> {
	for (const entry of popouts.values()) {
		if (entry.entityType === entityType && entry.entityId === entityId) {
			entry.win.focus()
			return entry.win.id
		}
	}

	if (!createRpcRef) {
		throw new Error('Registry not initialised')
	}

	const baseUrl = await resolveMainViewUrl()
	const separator = baseUrl.includes('?') ? '&' : '?'
	const url = `${baseUrl}${separator}popout=1&entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`

	const offset = (popoutCounter++ % 8) * 30
	const label = resolveEntityLabel(entityType, entityId)
	const win = new BrowserWindow({
		title: `${label} — Agent Eval`,
		url,
		rpc: createRpcRef(),
		frame: {
			width: 900,
			height: 700,
			x: 200 + offset,
			y: 150 + offset,
		},
		styleMask: {
			Closable: false,
		},
	})

	popouts.set(win.id, { win, entityType, entityId })
	win.on('close', () => {
		popouts.delete(win.id)
	})

	return win.id
}

export function getAllPopouts(): PopoutEntry[] {
	return [...popouts.values()]
}

export function closePopoutByWindowId(windowId: number) {
	const entry = popouts.get(windowId)
	if (entry) {
		entry.win.close()
	}
}

export function broadcastMessage(
	messageName: 'evalProgress' | 'evalComplete' | 'notification' | 'dataChanged',
	payload: unknown,
) {
	const send = (webviewRpc: WindowRpc | undefined) => {
		try {
			if (webviewRpc?.send[messageName]) {
				webviewRpc.send[messageName](payload)
			}
		} catch {
			// webview may not be ready
		}
	}

	if (mainWindowRef) {
		send(mainWindowRef.webview.rpc as unknown as WindowRpc)
	}

	for (const entry of popouts.values()) {
		send(entry.win.webview.rpc as unknown as WindowRpc)
	}
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), ms)),
	])
}

export async function resolveAllPopouts(): Promise<boolean> {
	const entries = [...popouts.values()]
	for (const entry of entries) {
		try {
			const rpc = entry.win.webview.rpc as unknown as WindowRpc
			const { isDirty } = await withTimeout(rpc.request.checkDirtyState({}), 5000)
			if (isDirty) {
				entry.win.focus()
				const { action } = await withTimeout(rpc.request.resolveCloseGuard({}), 30000)
				if (action === 'cancelled') {
					return false
				}
			}
			entry.win.close()
		} catch {
			try {
				entry.win.close()
			} catch {
				// ignore
			}
			popouts.delete(entry.win.id)
		}
	}

	return true
}
