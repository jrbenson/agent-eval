import { Electroview } from 'electrobun/view'
import type { AppRPC } from '../shared/rpc-types'

// Global refs for popout dirty guard — set by PopoutShell
export let popoutDirtyRef: {
	isDirty: () => boolean
	resolveClose: () => Promise<'saved' | 'discarded' | 'cancelled'>
} | null = null

export function setPopoutDirtyRef(ref: typeof popoutDirtyRef) {
	popoutDirtyRef = ref
}

const rpc = Electroview.defineRPC<AppRPC>({
	maxRequestTime: 120000,
	handlers: {
		requests: {
			checkDirtyState: () => {
				return { isDirty: popoutDirtyRef?.isDirty() ?? false }
			},
			resolveCloseGuard: async () => {
				if (!popoutDirtyRef?.isDirty()) {
					return { action: 'discarded' as const }
				}
				const action = await popoutDirtyRef.resolveClose()
				return { action }
			},
		},
		messages: {
			evalProgress: (progress) => {
				console.log(
					'[rpc] evalProgress',
					progress.status,
					`${progress.completedRuns}/${progress.totalRuns}`,
				)
				window.dispatchEvent(new CustomEvent('eval-progress', { detail: progress }))
			},
			evalComplete: (data) => {
				console.log('[rpc] evalComplete', data.runId, data.success)
				window.dispatchEvent(new CustomEvent('eval-complete', { detail: data }))
			},
			notification: (data) => {
				console.log(`[rpc] notification [${data.type}]`, data.message)
				window.dispatchEvent(new CustomEvent('rpc-notification', { detail: data }))
			},
			dataChanged: (data) => {
				console.log(`[rpc] dataChanged [${data.action}]`, data.entityType, data.entityId)
				window.dispatchEvent(new CustomEvent('data-changed', { detail: data }))
			},
		},
	},
})

const electroview = new Electroview({ rpc })

// Expose typed RPC request/send helpers
export const rpcRequest = electroview.rpc!.request
export const rpcSend = electroview.rpc!.send

export default electroview
