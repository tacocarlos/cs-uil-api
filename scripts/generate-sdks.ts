/**
 * Regenerates the client SDKs in `sdks/` from the committed `openapi.json`.
 *
 * Generator settings live in `openapitools.json`; each SDK's
 * `.openapi-generator-ignore` protects its hand-written files (build files,
 * README, the `LunaCsUilClient` layer).
 *
 *   bun run openapi:export   # refresh openapi.json first if the API changed
 *   bun run sdk:generate
 */
import { execFileSync } from "node:child_process";
import { appendFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Output directory of each generator in openapitools.json. */
const OUTPUTS = [
	"sdks/typescript/src/generated",
	"sdks/java",
	"sdks/python",
	"sdks/csharp",
];

// The generator never deletes files, so a model or API removed from the spec
// would linger. Remove everything the previous run generated first.
for (const output of OUTPUTS) {
	const manifest = path.join(ROOT, output, ".openapi-generator/FILES");
	const listed = await readFile(manifest, "utf8").catch(() => "");
	for (const file of listed.split("\n").filter(Boolean)) {
		await rm(path.join(ROOT, output, file), { force: true });
	}
}

execFileSync("npx", ["openapi-generator-cli", "generate"], {
	cwd: ROOT,
	stdio: "inherit",
});

// The generated package __init__ is rewritten every run; re-export the
// hand-written entry points from it so `from luna_cs_uil import LunaCsUilClient` works.
await appendFile(
	path.join(ROOT, "sdks/python/luna_cs_uil/__init__.py"),
	`
# Hand-written entry points (added by scripts/generate-sdks.ts)
from luna_cs_uil.client import DEFAULT_BASE_URL as DEFAULT_BASE_URL
from luna_cs_uil.client import LunaCsUilClient as LunaCsUilClient
from luna_cs_uil.figures import resolve_figures as resolve_figures
`,
);

console.log("Regenerated sdks/typescript, sdks/java, sdks/python and sdks/csharp.");
