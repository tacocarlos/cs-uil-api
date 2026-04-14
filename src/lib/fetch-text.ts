/**
 * Fetches the text content of a remote URL.
 *
 * Returns an empty string when:
 *  - `url` is null, undefined, or empty
 *  - the network request fails
 *  - the server responds with a non-2xx status
 *
 * `cache: "no-store"` prevents stale reads after content is updated.
 */
export async function fetchTextContent(
  url: string | null | undefined,
): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return "";
    return res.text();
  } catch {
    return "";
  }
}
