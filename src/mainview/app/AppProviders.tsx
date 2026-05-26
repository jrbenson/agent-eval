'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ColorModeProvider, type ColorModeProviderProps } from '../components/ui/color-mode'
import { Toaster } from '../components/ui/toaster'
import { system } from '../theme'

interface AppProvidersProps extends ColorModeProviderProps {
	children: ReactNode
	queryClient: QueryClient
}

export function AppProviders({ children, queryClient, ...colorModeProps }: AppProvidersProps) {
	return (
		<ChakraProvider value={system}>
			<ColorModeProvider {...colorModeProps}>
				<QueryClientProvider client={queryClient}>
					{children}
					<Toaster />
				</QueryClientProvider>
			</ColorModeProvider>
		</ChakraProvider>
	)
}
