import { ApplicationMenu, BrowserWindow, Utils } from 'electrobun/bun'
import Electrobun from 'electrobun/bun'
import { resolveMainViewUrl } from './app/resolve-view-url'
import { initDataDirs, setDataDir } from './data/paths'
import { createRpc } from './rpc/create-rpc'
import { getAllPopouts, initRegistry, resolveAllPopouts } from './windows/registry'

// Ensure all data directories exist at startup
setDataDir(Utils.paths.userData)
initDataDirs()

// ---- Window Creation ----
const url = await resolveMainViewUrl()

// Application menu is required on macOS for Cmd+C/V/X/A keyboard shortcuts
// to reach the WKWebView. Without it, the OS intercepts them at the menu bar level.
ApplicationMenu.setApplicationMenu([
	{
		submenu: [{ label: 'Quit Agent Eval', role: 'quit' }],
	},
	{
		label: 'Edit',
		submenu: [
			{ role: 'undo' },
			{ role: 'redo' },
			{ type: 'separator' },
			{ role: 'cut' },
			{ role: 'copy' },
			{ role: 'paste' },
			{ role: 'pasteAndMatchStyle' },
			{ role: 'delete' },
			{ role: 'selectAll' },
		],
	},
])

const mainWindow = new BrowserWindow({
	title: 'Agent Eval',
	url,
	rpc: createRpc(),
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
})

initRegistry(mainWindow, createRpc)

console.log('Agent Eval started!')

// Graceful shutdown — resolve dirty popouts before quitting
Electrobun.events.on('before-quit', async (event: { response: { allow: boolean } }) => {
	const popouts = getAllPopouts()
	if (popouts.length === 0) return

	// Block quit while we resolve popouts
	event.response = { allow: false }

	const allResolved = await resolveAllPopouts()
	if (allResolved) {
		// All popouts resolved — quit again (no popouts left, so it will proceed)
		process.exit(0)
	}
	// User cancelled — stay running
})
