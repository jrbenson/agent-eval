import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	root: 'src/mainview',
	build: {
		outDir: '../../dist',
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: true,
	},
})
