# LunaCsUil

.NET client for the UIL Computer Science problems API at `https://api.lunaghs.dev`: past contests' competitions, problems, statements and judge data.

> **Unofficial.** This project is not affiliated with or endorsed by the University Interscholastic League (UIL).

## Install

```sh
dotnet add package LunaCsUil
```

Targets .NET 8 and later.

## Usage

```csharp
using LunaCsUil;

using var client = new LunaCsUilClient();

var competitions = await client.Competitions.GetAllCompetitionsAsync();
var problems = await client.Competitions.GetCompetitionProblemsAsync(competitions[0].Id);

// The statement as markdown, with figure links pointing at their images.
var statement = await client.GetProblemStatementAsync(problems[0].Id);
```

`Problems`, `Competitions` and `Meta` expose every endpoint, each with sync and async methods. Failed requests throw `LunaCsUil.Client.ApiException`; `ErrorCode` is 404 for a missing problem or competition.

`new LunaCsUilClient(baseUrl, httpClient)` targets another server (`baseUrl` is the API origin without `/api`) and can share an `HttpClient`, e.g. from `IHttpClientFactory`; a client you pass in isn't disposed.

## Figures

Statements refer to figures by placeholder, e.g. `![Figure 1](uil-cs-api-figure:1)`, and `GetProblemMarkdownByIdAsync` returns each placeholder's current URL in `Images`. Image URLs can change, so resolve them when you render rather than storing them. `GetProblemStatementAsync` does this for you, or call `Figures.Resolve(markdown, images)` yourself. Placeholders without an image are left unchanged.

## Reference

Every endpoint and model is documented in [`docs/`](docs/).

## License

MIT. See [LICENSE](LICENSE).
