using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LunaCsUil.Client;
using Xunit;

namespace LunaCsUil.Test;

public class FiguresTests
{
    [Fact]
    public void ResolvesKnownPlaceholdersOnly()
    {
        var markdown = "![Figure 1](uil-cs-api-figure:1) and ![Figure 2](uil-cs-api-figure:2)";
        var images = new Dictionary<string, string> { ["uil-cs-api-figure:1"] = "https://cdn.example/1.png" };
        Assert.Equal(
            "![Figure 1](https://cdn.example/1.png) and ![Figure 2](uil-cs-api-figure:2)",
            Figures.Resolve(markdown, images));
    }

    [Fact]
    public void IgnoresTextThatIsNotALinkTarget()
    {
        var images = new Dictionary<string, string> { ["uil-cs-api-figure:1"] = "x" };
        Assert.Equal("see uil-cs-api-figure:1", Figures.Resolve("see uil-cs-api-figure:1", images));
    }
}

/// <summary>Live tests run against LUNA_CS_UIL_BASE_URL, e.g. a local server.</summary>
public class LiveApiTests : IDisposable
{
    private static readonly string? BaseUrl = Environment.GetEnvironmentVariable("LUNA_CS_UIL_BASE_URL");
    private readonly LunaCsUilClient _client = new(BaseUrl ?? LunaCsUilClient.DefaultBaseUrl);

    private static void RequireServer() =>
        Assert.SkipWhen(string.IsNullOrEmpty(BaseUrl), "LUNA_CS_UIL_BASE_URL not set");

    [Fact]
    public async Task Version()
    {
        RequireServer();
        Assert.StartsWith("v", await _client.Meta.GetVersionAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task CompetitionsAndTheirProblems()
    {
        RequireServer();
        var token = TestContext.Current.CancellationToken;
        var competitions = await _client.Competitions.GetAllCompetitionsAsync(2, cancellationToken: token);
        Assert.NotEmpty(competitions);
        Assert.NotEmpty(await _client.Competitions.GetCompetitionProblemsAsync(competitions[0].Id, token));
    }

    [Fact]
    public async Task ProblemStatement()
    {
        RequireServer();
        var token = TestContext.Current.CancellationToken;
        var first = (await _client.Problems.GetAllProblemsAsync(1, cancellationToken: token))[0];
        Assert.Equal(first.Name, (await _client.Problems.GetProblemByIdAsync(first.Id, token)).Name);
        Assert.Contains(first.Name, await _client.GetProblemStatementAsync(first.Id, token));
    }

    [Fact]
    public async Task MissingProblemIs404()
    {
        RequireServer();
        var error = await Assert.ThrowsAsync<ApiException>(
            () => _client.Problems.GetProblemByIdAsync(999_999_999, TestContext.Current.CancellationToken));
        Assert.Equal(404, error.ErrorCode);
    }

    public void Dispose() => _client.Dispose();
}
