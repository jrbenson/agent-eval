import { createContext, useContext, useEffect } from 'react'

export interface NavigationGuard {
	isDirty: () => boolean
	save: () => Promise<void>
}

interface NavigationGuardAPI {
	setGuard: (guard: NavigationGuard | null) => void
}

export const NavigationGuardContext = createContext<NavigationGuardAPI>({
	setGuard: () => {},
})

export function useNavigationGuard(guard: NavigationGuard | null) {
	const { setGuard } = useContext(NavigationGuardContext)
	useEffect(() => {
		setGuard(guard)
		return () => setGuard(null)
	}, [guard, setGuard])
}
