/**
 * Problem figures are stored apart from the markdown.
 *
 * Problem markdown refers to each figure only by a placeholder, written as an
 * ordinary image link: `![Figure 1](uil-cs-api-figure:1)`. The figure's file lives in
 * object storage, and its URL is kept in the `problem_images` table. Clients
 * get a placeholder → URL map alongside the markdown and swap the URL in at
 * render time. Moving the files to another storage provider then only means
 * rewriting rows, never the markdown.
 *
 * Safe to import from client components.
 */

/** A figure belonging to a problem. */
export interface ProblemImage {
  /** Markdown placeholder this figure fills, e.g. "uil-cs-api-figure:1" */
  placeholder: string;
  /** Public URL the figure is currently served from */
  url: string;
  /** Storage provider's identifier for the file, used to delete or migrate it */
  key: string;
  width: number | null;
  height: number | null;
}

/** placeholder → URL, the shape clients use to resolve markdown images. */
export type ProblemImageMap = Record<string, string>;

/**
 * Placeholders are shaped like a URL with a project-specific scheme. Markdown
 * parsers accept that as an image target without escaping, and nothing a
 * problem statement would contain can collide with it. A client that doesn't
 * resolve placeholders gets a broken image rather than a request to a
 * relative path on its own origin.
 */
const PLACEHOLDER_PREFIX = "uil-cs-api-figure:";

/** Matches a placeholder, e.g. "uil-cs-api-figure:12" */
export const PLACEHOLDER_PATTERN = /^uil-cs-api-figure:\d+$/;

/** The placeholder for the `n`th figure of a problem (1-based). */
export function figurePlaceholder(n: number): string {
  return `${PLACEHOLDER_PREFIX}${n}`;
}

/** The figure number in a placeholder, e.g. 12 for "uil-cs-api-figure:12". */
export function figureNumber(placeholder: string): number {
  return Number(placeholder.slice(PLACEHOLDER_PREFIX.length));
}

/**
 * Rewrites the bare `](FIGURE_N)` targets a model sometimes writes instead
 * of the requested placeholder, so they still resolve.
 */
export function normalizePlaceholders(markdown: string): string {
  return markdown.replace(/\]\(FIGURE_(\d+)\)/g, (_, n: string) =>
    `](${figurePlaceholder(Number(n))})`,
  );
}

export function toImageMap(images: readonly ProblemImage[]): ProblemImageMap {
  return Object.fromEntries(images.map((img) => [img.placeholder, img.url]));
}

/** Every distinct placeholder the markdown refers to, in document order. */
export function placeholdersIn(markdown: string): string[] {
  const found = new Set<string>();
  for (const match of markdown.matchAll(/\]\((uil-cs-api-figure:\d+)\)/g)) {
    found.add(match[1]!);
  }
  return [...found];
}
