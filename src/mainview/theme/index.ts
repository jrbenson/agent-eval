import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
	theme: {
		tokens: {
			fonts: {
				heading: {
					value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
				},
				body: {
					value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
				},
				mono: { value: `'JetBrains Mono', 'Fira Code', monospace` },
			},
		},
	},
	globalCss: {
		body: {
			bg: 'bg',
			color: 'fg',
		},
	},
})

export const system = createSystem(defaultConfig, config)

export default system
