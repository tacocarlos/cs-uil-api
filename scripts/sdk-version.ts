/**
 * Sets or checks the version of all four SDKs, which are released together.
 *
 *   bun run sdk:version 0.2.0         # set every SDK to 0.2.0 and regenerate
 *   bun run sdk:version --check       # exit 1 unless all SDKs agree
 *   bun run sdk:version --check 0.2.0 # exit 1 unless all SDKs are 0.2.0
 *
 * The release workflow runs the last form against its `sdk-v*` tag.
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?`;

/**
 * Every place a version is written. Each pattern captures the text before the
 * version in group 1 and the version itself in group 2.
 */
const LOCATIONS: Array<{ file: string; pattern: RegExp }> = [
	{
		file: "sdks/typescript/package.json",
		pattern: new RegExp(`^(  "version": ")(${SEMVER})"`, "m"),
	},
	{
		file: "sdks/python/pyproject.toml",
		pattern: new RegExp(`^(version = ")(${SEMVER})"`, "m"),
	},
	{
		file: "sdks/java/build.gradle.kts",
		pattern: new RegExp(`^(version = ")(${SEMVER})"`, "m"),
	},
	{
		file: "sdks/csharp/src/LunaCsUil/LunaCsUil.csproj",
		pattern: new RegExp(`(<Version>)(${SEMVER})</Version>`),
	},
	// The generators embed these in user agents and package metadata.
	{
		file: "openapitools.json",
		pattern: new RegExp(`("artifactVersion": ")(${SEMVER})"`),
	},
	{
		file: "openapitools.json",
		pattern: new RegExp(`("python"[\\s\\S]*?"packageVersion": ")(${SEMVER})"`),
	},
	{
		file: "openapitools.json",
		pattern: new RegExp(`("csharp"[\\s\\S]*?"packageVersion": ")(${SEMVER})"`),
	},
	{
		file: "sdks/java/README.md",
		pattern: new RegExp(`(io\\.github\\.tacocarlos:luna-cs-uil:)(${SEMVER})`),
	},
	{
		file: "sdks/java/README.md",
		pattern: new RegExp(`(<version>)(${SEMVER})</version>`),
	},
];

async function readVersions() {
	return Promise.all(
		LOCATIONS.map(async ({ file, pattern }) => {
			const text = await readFile(path.join(ROOT, file), "utf8");
			const version = pattern.exec(text)?.[2];
			if (!version) throw new Error(`No version found in ${file} for ${pattern}`);
			return { file, version };
		}),
	);
}

const args = process.argv.slice(2);

if (args[0] === "--check") {
	const expected = args[1];
	const versions = await readVersions();
	const wanted = expected ?? versions[0]?.version;
	const wrong = versions.filter((v) => v.version !== wanted);
	if (wrong.length > 0) {
		for (const { file, version } of versions) {
			console.error(`${version === wanted ? " " : "✗"} ${version}  ${file}`);
		}
		console.error(`\nSDK versions should all be ${wanted}. Run \`bun run sdk:version ${wanted}\`.`);
		process.exit(1);
	}
	console.log(`All SDKs are at ${wanted}.`);
} else if (args.length === 1 && new RegExp(`^${SEMVER}$`).test(args[0] ?? "")) {
	const version = args[0] as string;
	for (const { file, pattern } of LOCATIONS) {
		const target = path.join(ROOT, file);
		const text = await readFile(target, "utf8");
		await writeFile(
			target,
			text.replace(pattern, (match, before: string, old: string) =>
				match.replace(`${before}${old}`, `${before}${version}`),
			),
		);
	}
	// Regenerate so the version embedded in generated code matches.
	execFileSync("bun", ["run", "sdk:generate"], { cwd: ROOT, stdio: "inherit" });
	// uv.lock records the project's own version; CI installs with --locked.
	execFileSync("uv", ["lock"], {
		cwd: path.join(ROOT, "sdks/python"),
		stdio: "inherit",
	});
	console.log(`Set every SDK to ${version}.`);
} else {
	console.error("Usage: bun run sdk:version <x.y.z> | --check [x.y.z]");
	process.exit(1);
}
