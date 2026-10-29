package io.github.tacocarlos.lunacsuil;

import io.github.tacocarlos.lunacsuil.api.CompetitionApi;
import io.github.tacocarlos.lunacsuil.api.MetaApi;
import io.github.tacocarlos.lunacsuil.api.ProblemApi;
import io.github.tacocarlos.lunacsuil.model.ProblemMarkdown;

/**
 * Client for the UIL CS problems API.
 *
 * <pre>{@code
 * LunaCsUilClient client = new LunaCsUilClient();
 * List<Competition> competitions = client.competitions().getAllCompetitions(null, null);
 * String statement = client.getProblemStatement(competitions.get(0).getId());
 * }</pre>
 */
public final class LunaCsUilClient {
  /** Where the API is hosted. */
  public static final String DEFAULT_BASE_URL = "https://api.lunaghs.dev";

  private final ApiClient apiClient;
  private final ProblemApi problems;
  private final CompetitionApi competitions;
  private final MetaApi meta;

  /** A client for the hosted API. */
  public LunaCsUilClient() {
    this(DEFAULT_BASE_URL);
  }

  /** A client for the API at {@code baseUrl}, its origin without {@code /api}. */
  public LunaCsUilClient(String baseUrl) {
    this(apiClientFor(baseUrl));
  }

  private static ApiClient apiClientFor(String baseUrl) {
    ApiClient apiClient = new ApiClient();
    apiClient.updateBaseUri(baseUrl.replaceAll("/+$", ""));
    return apiClient;
  }

  /** A client using a configured {@link ApiClient}, e.g. with timeouts or interceptors. */
  public LunaCsUilClient(ApiClient apiClient) {
    this.apiClient = apiClient;
    this.problems = new ProblemApi(apiClient);
    this.competitions = new CompetitionApi(apiClient);
    this.meta = new MetaApi(apiClient);
  }

  public ApiClient apiClient() {
    return apiClient;
  }

  public ProblemApi problems() {
    return problems;
  }

  public CompetitionApi competitions() {
    return competitions;
  }

  public MetaApi meta() {
    return meta;
  }

  /**
   * A problem's statement as markdown, with figure placeholders replaced by their current image
   * URLs.
   *
   * @throws ApiException if the problem doesn't exist or the request fails
   */
  public String getProblemStatement(int id) throws ApiException {
    ProblemMarkdown statement = problems.getProblemMarkdownById(id);
    return Figures.resolve(statement.getMarkdown(), statement.getImages());
  }
}
