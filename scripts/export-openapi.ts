/**
 * Writes the API's OpenAPI spec to `openapi.json` at the repo root.
 *
 * The spec is committed so API changes show up as diffs, and so SDK generators
 * (e.g. the Java CLI's openapi-generator build) have a stable file to read.
 * CI runs this with `--check` and fails if the committed file is stale.
 *
 * No network or database access is needed: the request is handled in-process.
 *
 *   bun run openapi:export          # write openapi.json
 *   bun run openapi:export --check  # exit 1 if openapi.json is out of date
 */
import { readFile, writeFile } from "node:fs/promises";
import { UILApi } from "@/app/api/[[...slugs]]/eylsia";

const OUTPUT = new URL("../openapi.json", import.meta.url);

type Schema = Record<string, unknown>;

const isObject = (v: unknown): v is Schema =>
	typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Elysia documents the types it *accepts* (including the coercions it applies
 * to query strings and dates), not the types it *sends*. Those coercion unions
 * are noise to SDK generators: `anyOf: [string(format: integer), integer]`
 * becomes an `Object`-typed parameter in Java, and `type: "Date"` isn't valid
 * OpenAPI at all. This rewrites them to the canonical wire type.
 *
 * Only the exported file is normalized; `/api/openapi` still serves the raw
 * spec for the interactive docs.
 */
function normalizeSchema(node: unknown, inParameter = false): unknown {
	if (Array.isArray(node))
		return node.map((n) => normalizeSchema(n, inParameter));
	if (!isObject(node)) return node;

	const out: Schema = {};
	for (const [key, value] of Object.entries(node)) {
		// `$id` isn't part of OpenAPI 3.0 schema objects; Elysia adds it to models.
		if (key === "$id") continue;
		out[key] = normalizeSchema(value, inParameter);
	}

	// `t.Ref("Problem")` inside a `t.Array` is emitted as a bare model name.
	if (typeof out.$ref === "string" && !out.$ref.startsWith("#/")) {
		out.$ref = `#/components/schemas/${out.$ref}`;
	}

	// TypeBox bounds every t.Integer() by ±Number.MAX_SAFE_INTEGER. Generators
	// read those bounds as 64-bit, while unbounded integers (path parameters,
	// ShortProblem) become 32-bit, so an id from one call wouldn't fit another.
	if (
		out.type === "integer" &&
		out.minimum === -Number.MAX_SAFE_INTEGER &&
		out.maximum === Number.MAX_SAFE_INTEGER
	) {
		delete out.minimum;
		delete out.maximum;
	}

	// Dates are serialized as ISO-8601 strings by JSON.stringify.
	if (out.type === "Date") return { type: "string", format: "date-time" };

	// t.Record(t.String(), X) is emitted as `patternProperties: { "^(.*)$": X }`.
	// Generators only understand maps written as `additionalProperties`; most
	// turn this into an empty object.
	if (isObject(out.patternProperties)) {
		const patterns = Object.entries(out.patternProperties);
		if (patterns.length === 1 && patterns[0]?.[0] === "^(.*)$") {
			const { patternProperties: _, ...rest } = out;
			return { ...rest, additionalProperties: patterns[0][1] };
		}
	}

	if (!Array.isArray(out.anyOf)) return out;
	let branches = (out.anyOf as Schema[]).flatMap((b) =>
		// Flatten nested anyOf that carries no other keywords.
		Array.isArray(b.anyOf) && Object.keys(b).length === 1
			? (b.anyOf as Schema[])
			: [b],
	);

	const hasType = (type: string) => branches.some((b) => b.type === type);
	const isDateTime = (b: Schema) =>
		b.type === "string" && b.format === "date-time";

	// t.Date(): [date-time string, date string, number] -> date-time string.
	if (branches.some(isDateTime)) {
		branches = branches.filter(
			(b) =>
				isDateTime(b) ||
				b.type === "null" ||
				!(b.type === "number" || (b.type === "string" && b.format === "date")),
		);
	}

	// t.Integer()/t.Numeric()/t.BooleanString(): drop the string-encoded form
	// that Elysia accepts alongside the real type.
	branches = branches.filter(
		(b) =>
			!(
				b.type === "string" &&
				((b.format === "integer" && hasType("integer")) ||
					(b.format === "numeric" && hasType("number")) ||
					(b.format === "boolean" && hasType("boolean")))
			),
	);

	// Query/path parameters are always strings on the wire; a plain string
	// branch next to a numeric one is just empty-string leniency (OptionalInt).
	if (inParameter && (hasType("integer") || hasType("number"))) {
		branches = branches.filter((b) => !(b.type === "string" && !b.format));
	}

	// Elysia's t.Nullable emits both `nullable: true` and a `type: "null"`
	// branch; OpenAPI 3.0 only understands the former.
	const nullable =
		out.nullable === true || branches.some((b) => b.type === "null");
	branches = branches.filter((b) => b.type !== "null");

	const { anyOf: _, nullable: __, ...rest } = out;
	let merged: Schema;
	if (branches.length === 1) {
		merged = { ...rest, ...branches[0] };
	} else if (
		branches.length > 0 &&
		branches.every((b) => b.type === "string" && "const" in b)
	) {
		// Union of string literals -> enum.
		merged = { ...rest, type: "string", enum: branches.map((b) => b.const) };
	} else {
		merged = { ...rest, anyOf: branches };
	}
	if (nullable) merged.nullable = true;
	return merged;
}

/** Where the API is deployed. Spec paths already include the `/api` prefix. */
const SERVER_URL = "https://api.lunaghs.dev";

function normalizeSpec(spec: Schema): Schema {
	// Elysia documents group roots as `/api/problems/`, but Next.js redirects
	// that to `/api/problems` with a 308, which some HTTP clients (Java's
	// HttpClient by default) don't follow.
	spec.paths = Object.fromEntries(
		Object.entries(spec.paths as Schema).map(([path, item]) => [
			path.length > 1 ? path.replace(/\/+$/, "") : path,
			item,
		]),
	);
	spec.servers = [{ url: SERVER_URL }];

	const paths = spec.paths as Record<string, Record<string, Schema>>;
	for (const methods of Object.values(paths)) {
		for (const op of Object.values(methods)) {
			if (!Array.isArray(op.parameters)) continue;
			for (const param of op.parameters as Schema[]) {
				param.schema = normalizeSchema(param.schema, true);
			}
		}
	}
	return normalizeSchema(spec) as Schema;
}

const res = await UILApi.handle(
	new Request("http://localhost/api/openapi/json"),
);
if (!res.ok) {
	console.error(`Failed to load spec: ${res.status} ${await res.text()}`);
	process.exit(1);
}

const spec = `${JSON.stringify(normalizeSpec(await res.json()), null, 2)}\n`;

if (process.argv.includes("--check")) {
	const current = await readFile(OUTPUT, "utf8").catch(() => "");
	if (current !== spec) {
		console.error(
			"openapi.json is out of date. Run `bun run openapi:export` and commit the result.",
		);
		process.exit(1);
	}
	console.log("openapi.json is up to date.");
} else {
	await writeFile(OUTPUT, spec);
	console.log("Wrote openapi.json");
}
