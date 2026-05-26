import { faker } from '@faker-js/faker'

export interface GenerateFakeDataOptions {
	schema: Record<string, unknown>
	count?: number
	seed?: number
	locale?: string
	minArrayItems?: number
}

type FieldMatcher = {
	test: (key: string) => boolean
	gen: () => unknown
}

const fieldMatchers: FieldMatcher[] = [
	// Email
	{
		test: (k) => /^(e[-_]?mail([-_]?address)?)$/i.test(k),
		gen: () => faker.internet.email(),
	},
	// URL / website / homepage
	{
		test: (k) => /^(url|website|homepage|link|href)$/i.test(k),
		gen: () => faker.internet.url(),
	},
	// Username / handle
	{
		test: (k) => /^(user[-_]?name|handle|login|screen[-_]?name)$/i.test(k),
		gen: () => faker.internet.username(),
	},
	// Full name
	{
		test: (k) => /^(full[-_]?name|display[-_]?name|author|name)$/i.test(k),
		gen: () => faker.person.fullName(),
	},
	// First name
	{
		test: (k) => /^(first[-_]?name|given[-_]?name|fname)$/i.test(k),
		gen: () => faker.person.firstName(),
	},
	// Last name
	{
		test: (k) => /^(last[-_]?name|sur[-_]?name|family[-_]?name|lname)$/i.test(k),
		gen: () => faker.person.lastName(),
	},
	// Phone
	{
		test: (k) => /^(phone([-_]?number)?|tel(ephone)?|mobile|fax)$/i.test(k),
		gen: () => faker.phone.number(),
	},
	// Address (street)
	{
		test: (k) => /^(address|street([-_]?address)?)$/i.test(k),
		gen: () => faker.location.streetAddress(),
	},
	// City
	{
		test: (k) => /^(city|town|locality)$/i.test(k),
		gen: () => faker.location.city(),
	},
	// State / province
	{
		test: (k) => /^(state|province|region)$/i.test(k),
		gen: () => faker.location.state(),
	},
	// Country
	{
		test: (k) => /^(country|nation)$/i.test(k),
		gen: () => faker.location.country(),
	},
	// Zip / postal code
	{
		test: (k) => /^(zip([-_]?code)?|postal([-_]?code)?)$/i.test(k),
		gen: () => faker.location.zipCode(),
	},
	// Company / organization
	{
		test: (k) => /^(company|org(anization)?|employer|firm)$/i.test(k),
		gen: () => faker.company.name(),
	},
	// Title / job title
	{
		test: (k) => /^(title|job[-_]?title|position|role)$/i.test(k),
		gen: () => faker.person.jobTitle(),
	},
	// Description / bio / summary
	{
		test: (k) => /^(description|bio|summary|about|blurb|overview)$/i.test(k),
		gen: () => faker.lorem.sentence(),
	},
	// Avatar / image / photo
	{
		test: (k) =>
			/^(avatar([-_]?url)?|image([-_]?url)?|photo([-_]?url)?|picture|thumbnail)$/i.test(k),
		gen: () => faker.image.url(),
	},
	// UUID / id
	{ test: (k) => /^(uuid|guid)$/i.test(k), gen: () => faker.string.uuid() },
	{
		test: (k) => /^(id|identifier)$/i.test(k),
		gen: () => faker.string.alphanumeric(12),
	},
	// Date / timestamp
	{
		test: (k) =>
			/^(date|created[-_]?(at|on|date)?|updated[-_]?(at|on|date)?|timestamp|born[-_]?(at|on|date)?|birthday)$/i.test(
				k,
			),
		gen: () => faker.date.recent().toISOString(),
	},
	// IP address
	{
		test: (k) => /^(ip([-_]?address)?|ipv4)$/i.test(k),
		gen: () => faker.internet.ip(),
	},
	// Color
	{
		test: (k) => /^(color|colour|hex[-_]?color)$/i.test(k),
		gen: () => faker.color.rgb(),
	},
	// Price / amount / cost
	{
		test: (k) => /^(price|amount|cost|total|balance|salary|fee)$/i.test(k),
		gen: () => Number.parseFloat(faker.finance.amount()),
	},
	// Currency
	{
		test: (k) => /^(currency([-_]?code)?)$/i.test(k),
		gen: () => faker.finance.currencyCode(),
	},
	// Latitude
	{
		test: (k) => /^(lat(itude)?)$/i.test(k),
		gen: () => Number.parseFloat(faker.location.latitude().toString()),
	},
	// Longitude
	{
		test: (k) => /^(lng|lon(gitude)?)$/i.test(k),
		gen: () => Number.parseFloat(faker.location.longitude().toString()),
	},
]

/** Walk JSON Schema, set minItems on arrays that lack it */
function padArrayMins(schema: Record<string, unknown>, minItems: number): Record<string, unknown> {
	if (typeof schema !== 'object' || schema === null) return schema

	const out: Record<string, unknown> = { ...schema }

	if (out.type === 'array') {
		if (out.minItems == null) out.minItems = minItems
		if (out.items && typeof out.items === 'object') {
			out.items = padArrayMins(out.items as Record<string, unknown>, minItems)
		}
	}

	if (out.properties && typeof out.properties === 'object') {
		const props: Record<string, unknown> = {}
		for (const [key, val] of Object.entries(out.properties as Record<string, unknown>)) {
			props[key] =
				typeof val === 'object' && val !== null
					? padArrayMins(val as Record<string, unknown>, minItems)
					: val
		}
		out.properties = props
	}

	return out
}

/** Strip trailing 's', 'es', 'List', 'Array' to get singular form for matching */
function singularize(key: string): string {
	const s = key.replace(/(List|Array|Items|Set|Collection)$/i, '')
	if (s !== key) return s
	// Simple English plurals
	if (s.endsWith('ies')) return `${s.slice(0, -3)}y`
	if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes')) return s.slice(0, -2)
	if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1)
	return s
}

/** Find a matching faker generator for a property name */
function findMatcher(key: string): FieldMatcher | undefined {
	for (const m of fieldMatchers) {
		if (m.test(key)) return m
	}
	// Try singular form (handles "emails" → "email", "phoneNumbers" → "phoneNumber")
	const singular = singularize(key)
	if (singular !== key) {
		for (const m of fieldMatchers) {
			if (m.test(singular)) return m
		}
	}
	return undefined
}

/** Walk generated data + schema, replace string/number values where property name matches */
function applyContextualValues(data: unknown, schema: Record<string, unknown>): unknown {
	if (typeof schema !== 'object' || schema === null || data == null) return data

	if (schema.type === 'object' && schema.properties && typeof data === 'object') {
		const props = schema.properties as Record<string, Record<string, unknown>>
		const obj = { ...(data as Record<string, unknown>) }
		for (const [key, propSchema] of Object.entries(props)) {
			if (!(key in obj)) continue
			const val = obj[key]

			// Recurse into nested objects
			if (propSchema.type === 'object') {
				obj[key] = applyContextualValues(val, propSchema)
				continue
			}

			// Arrays: use the array property name to drive contextual generation for primitive items
			if (propSchema.type === 'array' && Array.isArray(val)) {
				const itemSchema = propSchema.items as Record<string, unknown> | undefined
				if (itemSchema) {
					// If items are objects, recurse into each
					if (itemSchema.type === 'object') {
						obj[key] = val.map((item) => applyContextualValues(item, itemSchema))
						continue
					}
					// For primitive items, match on the array's own property name
					const matcher = findMatcher(key)
					if (matcher) {
						obj[key] = val.map(() => matcher.gen())
					}
				}
				continue
			}

			// Only replace primitive string/number values
			if (typeof val !== 'string' && typeof val !== 'number') continue

			const matcher = findMatcher(key)
			if (matcher) {
				obj[key] = matcher.gen()
			}
		}
		return obj
	}

	return data
}

export async function generateFakeData(options: GenerateFakeDataOptions): Promise<unknown> {
	const { fake, seed: setSeed, setFaker } = await import('zod-schema-faker/v4')
	const { z } = await import('zod/v4')

	setFaker(faker)

	if (options.seed != null) {
		setSeed(options.seed)
		faker.seed(options.seed)
	}

	const minArr = options.minArrayItems ?? 3
	const prepared = padArrayMins(options.schema, minArr)
	const zodSchema = z.fromJSONSchema(prepared)

	const count = options.count ?? 1
	const generate = () => {
		const raw = fake(zodSchema)
		return applyContextualValues(raw, options.schema)
	}

	if (count > 1) {
		return faker.helpers.multiple(generate, { count })
	}
	return generate()
}
