package io.github.tacocarlos.lunacsuil;

import java.util.Map;

/**
 * Figure placeholders in problem statements.
 *
 * <p>Problem statements refer to figures by placeholder, e.g. {@code ![Figure 1](uil-cs-api-figure:1)},
 * and the API returns the current URL for each placeholder alongside the markdown. URLs can change
 * when the server moves its storage, so resolve them when rendering instead of saving them.
 */
public final class Figures {
  private Figures() {}

  /**
   * Returns {@code markdown} with every placeholder in {@code images} replaced by its URL.
   *
   * <p>Placeholders without a URL are left as they are, so a renderer can show them as missing.
   * Only link targets ({@code ](placeholder)}) are replaced; the placeholder format itself is the
   * server's business.
   */
  public static String resolve(String markdown, Map<String, String> images) {
    String resolved = markdown;
    for (Map.Entry<String, String> image : images.entrySet()) {
      resolved = resolved.replace("](" + image.getKey() + ")", "](" + image.getValue() + ")");
    }
    return resolved;
  }
}
