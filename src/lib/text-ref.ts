/**
 * A text payload that crosses the client/server boundary.
 *
 * Server action requests are capped at 1 MB (and Vercel caps requests and
 * responses at ~4.5 MB), but judge data can be far larger — one problem's
 * expected output is over 10 MB. Small text travels inline; anything larger is
 * uploaded to UploadThing and only its URL crosses the boundary.
 */
export type TextRef = { text: string } | { url: string };

/**
 * Largest text sent inline, in characters. Kept well under the 1 MB action
 * limit because one request can carry several fields at once.
 */
export const INLINE_TEXT_LIMIT = 150_000;

/** How much of a large output is sent back for on-screen previews. */
export const PREVIEW_CHARS = 20_000;

/** A display-only excerpt of `text`, marked when it was cut short. */
export function previewText(text: string): string {
  if (text.length <= PREVIEW_CHARS) return text;
  return `${text.slice(0, PREVIEW_CHARS)}\n… (preview truncated — ${(
    text.length - PREVIEW_CHARS
  ).toLocaleString()} more characters)`;
}
