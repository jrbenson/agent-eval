import { describe, expect, it } from 'bun:test'
import { validateToolInputFromSchema } from '../validation'

describe('tool input validation', () => {
	it('validates nested schemas and surfaces custom error messages at the failing path', () => {
		const schema = {
			type: 'object',
			properties: {
				profile: {
					type: 'object',
					properties: {
						age: {
							type: 'number',
							minimum: 18,
							'x-error-messages': {
								minimum: 'Age must be at least 18.',
							},
						},
						email: {
							type: 'string',
							format: 'email',
							'x-error-messages': {
								format: 'Email must be valid.',
							},
						},
					},
					required: ['age', 'email'],
					additionalProperties: false,
				},
				tags: {
					type: 'array',
					items: {
						type: 'string',
						minLength: 3,
						'x-error-messages': {
							minLength: 'Tags must be at least 3 characters.',
						},
					},
				},
			},
			required: ['profile', 'tags'],
			additionalProperties: false,
		} satisfies Record<string, unknown>

		const valid = validateToolInputFromSchema(
			{
				profile: { age: 30, email: 'user@example.com' },
				tags: ['docs', 'tests'],
			},
			schema,
		)
		expect(valid.passed).toBe(true)
		expect(valid.errors).toBeNull()

		const invalid = validateToolInputFromSchema(
			{
				profile: { age: 16, email: 'not-an-email' },
				tags: ['ok', 'qa'],
			},
			schema,
		)

		expect(invalid.passed).toBe(false)
		expect(invalid.errors).toEqual(
			expect.arrayContaining([
				'profile.age: Age must be at least 18.',
				'profile.email: Email must be valid.',
				'tags.0: Tags must be at least 3 characters.',
				'tags.1: Tags must be at least 3 characters.',
			]),
		)
	})
})
