/**
 * Simple concurrency limiter for parallel eval runs.
 * Supports per-provider rate limiting.
 */
export class ConcurrencyLimiter {
	private running = 0
	private queue: (() => void)[] = []

	constructor(private maxConcurrency: number) {}

	async acquire(): Promise<void> {
		if (this.running < this.maxConcurrency) {
			this.running++
			return
		}

		return new Promise<void>((resolve) => {
			this.queue.push(() => {
				this.running++
				resolve()
			})
		})
	}

	release(): void {
		this.running--
		const next = this.queue.shift()
		if (next) next()
	}

	async run<T>(fn: () => Promise<T>): Promise<T> {
		await this.acquire()
		try {
			return await fn()
		} finally {
			this.release()
		}
	}
}
