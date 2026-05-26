import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

const TrailingActionContext = createContext<ReactNode>(null)

export const TrailingActionProvider = TrailingActionContext.Provider

export function useTrailingAction(): ReactNode {
	return useContext(TrailingActionContext)
}
