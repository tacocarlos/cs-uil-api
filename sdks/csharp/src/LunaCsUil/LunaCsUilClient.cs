using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using LunaCsUil.Api;

namespace LunaCsUil
{
    /// <summary>
    /// Client for the UIL CS problems API.
    /// </summary>
    /// <example>
    /// <code>
    /// using var client = new LunaCsUilClient();
    /// var competitions = await client.Competitions.GetAllCompetitionsAsync();
    /// var statement = await client.GetProblemStatementAsync(competitions[0].Id);
    /// </code>
    /// </example>
    public sealed class LunaCsUilClient : IDisposable
    {
        /// <summary>Where the API is hosted.</summary>
        public const string DefaultBaseUrl = "https://api.lunaghs.dev";

        private readonly HttpClient _httpClient;
        private readonly bool _ownsHttpClient;

        /// <summary>Problem endpoints.</summary>
        public ProblemApi Problems { get; }

        /// <summary>Competition endpoints.</summary>
        public CompetitionApi Competitions { get; }

        /// <summary>API metadata endpoints.</summary>
        public MetaApi Meta { get; }

        /// <summary>
        /// Creates a client for the API at <paramref name="baseUrl"/> (its origin, without <c>/api</c>).
        /// </summary>
        /// <param name="baseUrl">API origin. Defaults to <see cref="DefaultBaseUrl"/>.</param>
        /// <param name="httpClient">
        /// An <see cref="HttpClient"/> to use, e.g. from <c>IHttpClientFactory</c>. The caller keeps
        /// ownership of it. If omitted, the client creates one and disposes it.
        /// </param>
        public LunaCsUilClient(string baseUrl = DefaultBaseUrl, HttpClient? httpClient = null)
        {
            _ownsHttpClient = httpClient == null;
            _httpClient = httpClient ?? new HttpClient();
            var basePath = baseUrl.TrimEnd('/');
            Problems = new ProblemApi(_httpClient, basePath);
            Competitions = new CompetitionApi(_httpClient, basePath);
            Meta = new MetaApi(_httpClient, basePath);
        }

        /// <summary>
        /// A problem's statement as markdown, with figure placeholders replaced by their current
        /// image URLs.
        /// </summary>
        public async Task<string> GetProblemStatementAsync(int id, CancellationToken cancellationToken = default)
        {
            var statement = await Problems.GetProblemMarkdownByIdAsync(id, cancellationToken).ConfigureAwait(false);
            return Figures.Resolve(statement.Markdown, statement.Images);
        }

        /// <inheritdoc />
        public void Dispose()
        {
            if (_ownsHttpClient)
            {
                _httpClient.Dispose();
            }
        }
    }
}
