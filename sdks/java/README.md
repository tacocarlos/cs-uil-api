# luna-cs-uil (Java)

Java client for the UIL Computer Science problems API at `https://api.lunaghs.dev`: past contests' competitions, problems, statements and judge data.

> **Unofficial.** This project is not affiliated with or endorsed by the University Interscholastic League (UIL).

## Install

Gradle:

```kotlin
implementation("io.github.tacocarlos:luna-cs-uil:0.0.1")
```

Maven:

```xml
<dependency>
  <groupId>io.github.tacocarlos</groupId>
  <artifactId>luna-cs-uil</artifactId>
  <version>0.0.1</version>
</dependency>
```

Requires Java 11+.

## Usage

```java
import io.github.tacocarlos.lunacsuil.LunaCsUilClient;
import io.github.tacocarlos.lunacsuil.model.Competition;
import io.github.tacocarlos.lunacsuil.model.Problem;

LunaCsUilClient client = new LunaCsUilClient();

List<Competition> competitions = client.competitions().getAllCompetitions(null, null);
List<Problem> problems = client.competitions().getCompetitionProblems(competitions.get(0).getId());

// The statement as markdown, with figure links pointing at their images.
String statement = client.getProblemStatement(problems.get(0).getId());
```

`problems()`, `competitions()` and `meta()` expose every endpoint. Failed requests throw `ApiException`; `getCode()` is 404 for a missing problem or competition.

`new LunaCsUilClient(baseUrl)` targets another server (`baseUrl` is the API origin without `/api`); `new LunaCsUilClient(apiClient)` takes a configured `ApiClient`, e.g. with timeouts.

## Figures

Statements refer to figures by placeholder, e.g. `![Figure 1](uil-cs-api-figure:1)`, and `getProblemMarkdownById` returns each placeholder's current URL in `getImages()`. Image URLs can change, so resolve them when you render rather than storing them. `getProblemStatement` does this for you, or call `Figures.resolve(markdown, images)` yourself. Placeholders without an image are left unchanged.

## Reference

Every endpoint and model is documented in [`docs/`](docs/).

## License

MIT. See [LICENSE](LICENSE).
