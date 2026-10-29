# SDKs

Client libraries for the public API, generated from [`openapi.json`](../openapi.json) with [OpenAPI Generator](https://openapi-generator.tech) 7.26.0.

| Language | Package | Directory |
|---|---|---|
| TypeScript | npm `@tacocarlos/luna-cs-uil` | [`typescript/`](typescript/) |
| Java | Maven `io.github.tacocarlos:luna-cs-uil` | [`java/`](java/) |
| Python | PyPI `luna-cs-uil` | [`python/`](python/) |
| C# | NuGet `LunaCsUil` | [`csharp/`](csharp/) |

Each SDK is generated HTTP code and models plus a small hand-written layer that is the same in every language:

- `LunaCsUilClient`: one object exposing the `problems`, `competitions` and `meta` APIs, defaulting to `https://api.lunaghs.dev`, with `getProblemStatement(id)` returning the statement with figures resolved.
- `resolveFigures` / `Figures.resolve`: replaces figure placeholders with the image URLs from a `ProblemMarkdown`'s `images`. It only matches `](placeholder)` link targets, so the placeholder format stays the server's business.

## Regenerating

After an API change:

```sh
bun run openapi:export   # refresh openapi.json from the Elysia app
bun run sdk:generate     # regenerate all four SDKs
```

Generator settings are in [`openapitools.json`](../openapitools.json). Each SDK's `.openapi-generator-ignore` keeps the generator away from hand-written files (build files, README, tests, the client layer) and skips templates we don't use. `sdk:generate` first deletes the files the previous run generated, so models removed from the spec disappear too.

## Testing

Every SDK has figure-resolution unit tests plus live tests against a running API, which run only when `LUNA_CS_UIL_BASE_URL` is set:

```sh
export LUNA_CS_UIL_BASE_URL=http://localhost:3000   # or https://api.lunaghs.dev

(cd typescript && bun install && bun run build && bun test)
(cd python && uv run pytest)
(cd java && ./gradlew test)
(cd csharp && dotnet test)
```
