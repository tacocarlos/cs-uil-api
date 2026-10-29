import { describe, expect, test } from "bun:test";
import { LunaCsUilClient, ResponseError, resolveFigures } from "../src/index.js";

describe("resolveFigures", () => {
  test("replaces known placeholders and leaves unknown ones", () => {
    const markdown = "![Figure 1](uil-cs-api-figure:1) and ![Figure 2](uil-cs-api-figure:2)";
    expect(resolveFigures(markdown, { "uil-cs-api-figure:1": "https://cdn.example/1.png" })).toBe(
      "![Figure 1](https://cdn.example/1.png) and ![Figure 2](uil-cs-api-figure:2)",
    );
  });

  test("does not touch a placeholder that isn't a link target", () => {
    expect(resolveFigures("see uil-cs-api-figure:1", { "uil-cs-api-figure:1": "x" })).toBe(
      "see uil-cs-api-figure:1",
    );
  });
});

// Live tests run against LUNA_CS_UIL_BASE_URL, e.g. a local server.
const baseUrl = process.env.LUNA_CS_UIL_BASE_URL;

describe.skipIf(!baseUrl)("live API", () => {
  const client = new LunaCsUilClient({ baseUrl });

  test("version", async () => {
    expect(await client.meta.getVersion()).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  test("competitions and their problems", async () => {
    const competitions = await client.competitions.getAllCompetitions({ limit: 2 });
    expect(competitions.length).toBeGreaterThan(0);
    const problems = await client.competitions.getCompetitionProblems({ id: competitions[0]!.id });
    expect(problems.length).toBeGreaterThan(0);
  });

  test("problem statement", async () => {
    const [first] = await client.problems.getAllProblems({ limit: 1 });
    const problem = await client.problems.getProblemById({ id: first!.id });
    expect(problem.name).toBe(first!.name);
    expect(await client.getProblemStatement(first!.id)).toContain(first!.name);
  });

  test("missing problem is a 404", async () => {
    const error = await client.problems.getProblemById({ id: 999_999_999 }).catch((e) => e);
    expect(error).toBeInstanceOf(ResponseError);
    expect((error as ResponseError).response.status).toBe(404);
  });
});
