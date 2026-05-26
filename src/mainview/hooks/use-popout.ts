import { createContext, useContext } from 'react'

const PopoutContext = createContext(false)

export const PopoutProvider = PopoutContext.Provider

export function useIsPopout() {
	return useContext(PopoutContext)
}
