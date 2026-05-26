import { QueryClient } from '@tanstack/react-query'

export function createMainviewQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000,
				retry: 1,
			},
		},
	})
}
