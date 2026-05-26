/**
 * Latin square ordering generator for survey question ordering.
 */

/**
 * Generate a balanced Latin square (Williams design) for counterbalancing.
 * For even n, produces n orderings. For odd n, produces 2n orderings.
 * Each condition precedes every other condition equally often.
 */
export function generateBalancedLatinSquare(n: number): number[][] {
	const square: number[][] = []

	for (let i = 0; i < n; i++) {
		const row: number[] = []
		for (let j = 0; j < n; j++) {
			if (j === 0) {
				row.push(i)
			} else if (j % 2 === 1) {
				row.push((i + Math.ceil(j / 2)) % n)
			} else {
				row.push((i + n - Math.floor(j / 2)) % n)
			}
		}
		square.push(row)
	}

	// For odd n, add the reverse of each row
	if (n % 2 === 1) {
		for (let i = 0; i < n; i++) {
			square.push([...square[i]].reverse())
		}
	}

	return square
}

/**
 * Get the question ordering for a specific run in the Latin square design.
 * @param questionCount Total number of questions
 * @param runIndex The index of this run (0-based)
 * @returns Array of question indices in the order they should be presented
 */
export function getLatinSquareOrdering(questionCount: number, runIndex: number): number[] {
	const square = generateBalancedLatinSquare(questionCount)
	const rowIndex = runIndex % square.length
	return square[rowIndex]
}

/**
 * Get a randomized question ordering.
 * Uses Fisher-Yates shuffle for uniform randomness.
 */
export function getRandomizedOrdering(questionCount: number): number[] {
	const indices = Array.from({ length: questionCount }, (_, i) => i)

	for (let i = indices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[indices[i], indices[j]] = [indices[j], indices[i]]
	}

	return indices
}

/**
 * Get question ordering based on strategy.
 */
export function getQuestionOrdering(
	questionCount: number,
	strategy: 'fixed' | 'randomized' | 'latin_square',
	runIndex: number,
): number[] {
	switch (strategy) {
		case 'fixed':
			return Array.from({ length: questionCount }, (_, i) => i)
		case 'randomized':
			return getRandomizedOrdering(questionCount)
		case 'latin_square':
			return getLatinSquareOrdering(questionCount, runIndex)
	}
}
