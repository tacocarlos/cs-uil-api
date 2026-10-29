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

## Releasing

All four SDKs share one version and are released together by [`.github/workflows/sdks.yml`](../.github/workflows/sdks.yml). On every push and pull request that touches the API or the SDKs, it checks that `openapi.json` and the SDKs are up to date and that the versions agree, then runs every SDK's tests against `https://api.lunaghs.dev`. A tag `sdk-vX.Y.Z` does the same and then publishes to all four registries.

```sh
bun run sdk:version 0.2.0                        # sets every package version and regenerates
git commit -am "Release SDKs 0.2.0"
git tag sdk-v0.2.0
git push origin main sdk-v0.2.0
```

The tag must match the version in the files, or the release stops before publishing. Publish jobs run in the `release` environment, so you can require a manual approval in **Settings → Environments → release**.

### One-time setup

The `release` environment (only `sdk-v*` tags may use it; you approve each release) and the `NUGET_USER` variable are already set up. Then set up each registry.

**npm** (`@tacocarlos/luna-cs-uil`). The `@tacocarlos` scope needs an npm account or organization named `tacocarlos`. Under the package's **Settings → Trusted publishing**, add GitHub Actions with repository `tacocarlos/cs-uil-api`, workflow `sdks.yml` and environment `release`. Trusted publishing can only be set up for a package that exists, so publish the first version by hand, then add it from the CLI (npm asks for your 2FA code):
```sh
cd sdks/typescript
npm login
npm publish --access public
npm trust github --repository tacocarlos/cs-uil-api --file sdks.yml --environment release
``` Provenance is added automatically because the repository is public.

**PyPI** (`luna-cs-uil`). In your PyPI account under **Publishing → Add a new pending publisher**, enter project `luna-cs-uil`, owner `tacocarlos`, repository `cs-uil-api`, workflow `sdks.yml`, environment `release`. The first release creates the project.

**NuGet** (`LunaCsUil`). On nuget.org under **Trusted Publishing**, add a policy for repository owner `tacocarlos`, repository `cs-uil-api`, workflow file `sdks.yml`, environment `release`. The workflow logs in as the nuget.org user in the repository variable `NUGET_USER` (set to `tacocarlos`).

**Maven Central** (`io.github.tacocarlos:luna-cs-uil`). Maven Central has no trusted publishing, so this one uses secrets.

1. Sign in to [central.sonatype.com](https://central.sonatype.com) with GitHub; the `io.github.tacocarlos` namespace is verified from your GitHub account.
2. Under **View Account → Generate User Token**, create a token. Store its two halves as secrets of the `release` environment, so only approved release jobs can read them (`gh` prompts for each value):
   ```sh
   gh secret set MAVEN_CENTRAL_USERNAME --env release
   gh secret set MAVEN_CENTRAL_PASSWORD --env release
   ```
3. Create a GPG signing key, publish its public half (Central uses it to check signatures), and store the private half without printing it:
   ```sh
   brew install gnupg
   gpg --quick-gen-key "Carlos Luna" ed25519 sign never
   gpg --list-secret-keys --keyid-format long          # note the key ID
   gpg --keyserver keys.openpgp.org --send-keys <KEY_ID>
   gpg --armor --export-secret-keys <KEY_ID> | gh secret set SIGNING_KEY --env release
   gh secret set SIGNING_KEY_PASSWORD --env release   # the key's passphrase
   ```

Releases go straight from upload to public (`publishAndReleaseToMavenCentral`); Maven Central versions can never be deleted or replaced.
