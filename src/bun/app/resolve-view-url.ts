import { Updater } from 'electrobun/bun'

const DEV_SERVER_PORT = 5173
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`
const PRODUCTION_VIEW_URL = 'views://mainview/index.html'

export async function resolveMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel()
	if (channel === 'dev') {
		try {
			await fetch(DEV_SERVER_URL, { method: 'HEAD' })
			return DEV_SERVER_URL
		} catch {
			// fall through
		}
	}

	return PRODUCTION_VIEW_URL
}
