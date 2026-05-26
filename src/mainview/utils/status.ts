import type { RunStatus } from '../../shared/rpc-types'

export function statusColor(status: RunStatus | string): string {
	switch (status) {
		case 'completed':
			return 'green'
		case 'failed':
			return 'red'
		case 'running':
			return 'blue'
		case 'cancelled':
			return 'yellow'
		default:
			return 'gray'
	}
}
