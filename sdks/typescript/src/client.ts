import {
  CompetitionApi,
  Configuration,
  MetaApi,
  ProblemApi,
} from "./generated/index.js";
import { resolveFigures } from "./figures.js";

/** Where the API is hosted. */
export const DEFAULT_BASE_URL = "https://api.lunaghs.dev";

export interface LunaCsUilClientOptions {
  /** API origin, without the `/api` prefix. Defaults to {@link DEFAULT_BASE_URL}. */
  baseUrl?: string;
  /** `fetch` implementation to use, e.g. for tests or older runtimes. */
  fetch?: typeof fetch;
}

/**
 * Client for the UIL CS problems API.
 *
 * ```ts
 * const client = new LunaCsUilClient();
 * const competitions = await client.competitions.getAllCompetitions();
 * const statement = await client.getProblemStatement(competitions[0].id);
 * ```
 */
export class LunaCsUilClient {
  readonly problems: ProblemApi;
  readonly competitions: CompetitionApi;
  readonly meta: MetaApi;

  constructor(options: LunaCsUilClientOptions = {}) {
    const configuration = new Configuration({
      basePath: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
      fetchApi: options.fetch,
    });
    this.problems = new ProblemApi(configuration);
    this.competitions = new CompetitionApi(configuration);
    this.meta = new MetaApi(configuration);
  }

  /**
   * A problem's statement as markdown, with figure placeholders replaced by
   * their current image URLs.
   */
  async getProblemStatement(id: number): Promise<string> {
    const { markdown, images } = await this.problems.getProblemMarkdownById({
      id,
    });
    return resolveFigures(markdown, images);
  }
}
