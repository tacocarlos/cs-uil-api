package io.github.tacocarlos.lunacsuil;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.tacocarlos.lunacsuil.model.Competition;
import io.github.tacocarlos.lunacsuil.model.ShortProblem;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

class LunaCsUilClientTest {
  @Test
  void resolvesKnownPlaceholdersOnly() {
    String markdown = "![Figure 1](uil-cs-api-figure:1) and ![Figure 2](uil-cs-api-figure:2)";
    assertEquals(
        "![Figure 1](https://cdn.example/1.png) and ![Figure 2](uil-cs-api-figure:2)",
        Figures.resolve(markdown, Map.of("uil-cs-api-figure:1", "https://cdn.example/1.png")));
  }

  @Test
  void ignoresTextThatIsNotALinkTarget() {
    assertEquals(
        "see uil-cs-api-figure:1",
        Figures.resolve("see uil-cs-api-figure:1", Map.of("uil-cs-api-figure:1", "x")));
  }


  /** Live tests run against LUNA_CS_UIL_BASE_URL, e.g. a local server. */
  private static LunaCsUilClient live() {
    return new LunaCsUilClient(System.getenv("LUNA_CS_UIL_BASE_URL"));
  }

  @Test
  @EnabledIfEnvironmentVariable(named = "LUNA_CS_UIL_BASE_URL", matches = ".+")
  void version() throws ApiException {
    assertTrue(live().meta().getVersion().startsWith("v"));
  }

  @Test
  @EnabledIfEnvironmentVariable(named = "LUNA_CS_UIL_BASE_URL", matches = ".+")
  void competitionsAndTheirProblems() throws ApiException {
    LunaCsUilClient client = live();
    List<Competition> competitions = client.competitions().getAllCompetitions(2, null);
    assertFalse(competitions.isEmpty());
    assertFalse(client.competitions().getCompetitionProblems(competitions.get(0).getId()).isEmpty());
  }

  @Test
  @EnabledIfEnvironmentVariable(named = "LUNA_CS_UIL_BASE_URL", matches = ".+")
  void problemStatement() throws ApiException {
    LunaCsUilClient client = live();
    ShortProblem first = client.problems().getAllProblems(1, null).get(0);
    assertEquals(first.getName(), client.problems().getProblemById(first.getId()).getName());
    assertTrue(client.getProblemStatement(first.getId()).contains(first.getName()));
  }

  @Test
  @EnabledIfEnvironmentVariable(named = "LUNA_CS_UIL_BASE_URL", matches = ".+")
  void missingProblemIs404() {
    ApiException error = assertThrows(ApiException.class, () -> live().problems().getProblemById(999_999_999));
    assertEquals(404, error.getCode());
  }
}
