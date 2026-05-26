import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initDataDirs, resetDataDirForTests, setDataDirForTests } from '../../bun/data/paths'
import type { ProviderModelResolver } from '../../bun/engine/provider-registry'
import {
	resetProviderModelResolverForTests,
	setProviderModelResolverForTests,
} from '../../bun/engine/provider-registry'

export function createTempDataDir(prefix = 'agent-eval-test-'): string {
	return mkdtempSync(join(tmpdir(), prefix))
}

export function installTestDataDir(dataDir: string): void {
	setDataDirForTests(dataDir)
	initDataDirs()
}

export function installTestModelResolver(resolver: ProviderModelResolver): void {
	setProviderModelResolverForTests(resolver)
}

export function resetTestRuntime(dataDir?: string): void {
	resetProviderModelResolverForTests()
	resetDataDirForTests()
	if (dataDir) {
		rmSync(dataDir, { recursive: true, force: true })
	}
}

export async function withTestRuntime<T>(opts: {
	dataDir?: string
	modelResolver?: ProviderModelResolver
	run: (context: { dataDir: string }) => Promise<T> | T
}): Promise<T> {
	const dataDir = opts.dataDir ?? createTempDataDir()
	installTestDataDir(dataDir)
	if (opts.modelResolver) {
		installTestModelResolver(opts.modelResolver)
	}

	try {
		return await opts.run({ dataDir })
	} finally {
		resetTestRuntime(dataDir)
	}
}
