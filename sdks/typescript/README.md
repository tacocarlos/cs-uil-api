# @tacocarlos/luna-cs-uil

TypeScript client for the UIL Computer Science problems API at `https://api.lunaghs.dev`: past contests' competitions, problems, statements and judge data.

> **Unofficial.** This project is not affiliated with or endorsed by the University Interscholastic League (UIL).

## Install

```sh
npm install @tacocarlos/luna-cs-uil
```

Works anywhere `fetch` is available (Node 18+, Bun, Deno, browsers).

## Usage

```ts
import { LunaCsUilClient } from "@tacocarlos/luna-cs-uil";

const client = new LunaCsUilClient();

const competitions = await client.competitions.getAllCompetitions();
const problems = await client.competitions.getCompetitionProblems({ id: competitions[0].id });

// The statement as markdown, with figure links pointing at their images.
const statement = await client.getProblemStatement(problems[0].id);
```

`client.problems`, `client.competitions` and `client.meta` expose every endpoint. Failed requests throw `ResponseError`; a missing problem or competition is a 404:

```ts
import { ResponseError } from "@tacocarlos/luna-cs-uil";

try {
  await client.problems.getProblemById({ id: 123 });
} catch (error) {
  if (error instanceof ResponseError && error.response.status === 404) {
    // no such problem
  }
}
```

Options: `new LunaCsUilClient({ baseUrl, fetch })`. `baseUrl` is the API origin without `/api`.

## Figures

Statements refer to figures by placeholder, e.g. `![Figure 1](uil-cs-api-figure:1)`, and `getProblemMarkdownById` returns each placeholder's current URL in `images`. Image URLs can change, so resolve them when you render rather than storing them. `getProblemStatement` does this for you, or call `resolveFigures(markdown, images)` yourself. Placeholders without an image are left unchanged.

## License

MIT. See [LICENSE](LICENSE).
