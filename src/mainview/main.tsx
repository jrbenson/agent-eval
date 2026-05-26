import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import PopoutShell from './PopoutShell'
import { AppProviders } from './app/AppProviders'
import { createMainviewQueryClient } from './app/query-client'
import './index.css'
import './rpc'

const queryClient = createMainviewQueryClient()

const params = new URLSearchParams(window.location.search)
const isPopout = params.get('popout') === '1'
const entityType = params.get('entityType')
const entityId = params.get('entityId')

const root = document.getElementById('root')!

if (isPopout && entityType && entityId) {
	createRoot(root).render(
		<StrictMode>
			<PopoutShell entityType={entityType} entityId={entityId} />
		</StrictMode>,
	)
} else {
	createRoot(root).render(
		<StrictMode>
			<AppProviders defaultTheme="dark" queryClient={queryClient}>
				<App />
			</AppProviders>
		</StrictMode>,
	)
}
