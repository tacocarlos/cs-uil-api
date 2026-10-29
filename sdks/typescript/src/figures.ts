/**
 * Problem statements refer to figures by placeholder, e.g.
 * `![Figure 1](uil-cs-api-figure:1)`, and the API returns the current URL for
 * each placeholder alongside the markdown. URLs can change when the server
 * moves its storage, so resolve them when rendering instead of saving them.
 */

/**
 * Returns `markdown` with every figure placeholder that `images` knows replaced
 * by its URL. Placeholders without a URL are left as they are, so a renderer
 * can show them as missing.
 *
 * Only link targets are replaced (`](placeholder)`); the placeholder format
 * itself is the server's business, so nothing here depends on it.
 */
export function resolveFigures(
  markdown: string,
  images: Readonly<Record<string, string>>,
): string {
  let resolved = markdown;
  for (const [placeholder, url] of Object.entries(images)) {
    resolved = resolved.split(`](${placeholder})`).join(`](${url})`);
  }
  return resolved;
}
