import type { Page, Rect } from "mupdf";

import { figureNumber, figurePlaceholder } from "@/lib/problem-images";

import type { FigureLocation } from "./types";

/** A figure rendered out of the student packet, ready to upload. */
export interface CapturedFigure {
  /** Markdown placeholder this figure fills, e.g. "uil-cs-api-figure:1" */
  placeholder: string;
  filename: string;
  data: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

/** Render resolution: 3× the PDF's 72 dpi keeps code and small labels legible. */
const RENDER_SCALE = 3;

/** Longest edge of a rendered figure, in pixels. */
const MAX_EDGE_PX = 2400;

/**
 * Breathing room added around a figure located from the model's box or a
 * vector drawing, in PDF points. Raster crops use the image's exact bounds,
 * since padding them picks up slivers of the surrounding text.
 */
const PADDING_PT = 4;

/** Model boxes use a 0–1000 grid over the page, origin top-left. */
const GRID = 1000;

// ---------------------------------------------------------------------------
// Rect helpers (all in PDF points)
// ---------------------------------------------------------------------------

const width = (r: Rect) => Math.max(0, r[2] - r[0]);
const height = (r: Rect) => Math.max(0, r[3] - r[1]);
const area = (r: Rect) => width(r) * height(r);

function intersect(a: Rect, b: Rect): Rect {
  return [
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
    Math.min(a[2], b[2]),
    Math.min(a[3], b[3]),
  ];
}

function union(rects: Rect[]): Rect {
  return rects.reduce((u, r) => [
    Math.min(u[0], r[0]),
    Math.min(u[1], r[1]),
    Math.max(u[2], r[2]),
    Math.max(u[3], r[3]),
  ]);
}

function grow(r: Rect, by: number): Rect {
  return [r[0] - by, r[1] - by, r[2] + by, r[3] + by];
}

// ---------------------------------------------------------------------------
// Locating a figure on its page
// ---------------------------------------------------------------------------

interface PageContent {
  bounds: Rect;
  /** Embedded raster images (screenshots, scanned diagrams) */
  images: Rect[];
  /** Vector paths: lines, curves, arrows, cell borders and fills */
  vectors: Rect[];
  /** Bounding boxes of every text line */
  lines: Rect[];
  /** Text lines near the top of the page, where problem headings sit */
  topLines: string[];
}

/**
 * Rectangles wider than this share of the page are bands behind a whole line
 * or block: shading behind code or ASCII art in sample output, or the page's
 * header bar. They are never part of a drawing.
 */
const MAX_BAND_WIDTH = 0.75;

/** Rasters smaller than this on either side are icons or bullets, not figures. */
const MIN_RASTER_PT = 24;

function readPage(page: Page): PageContent {
  const bounds = page.getBounds();
  const content: PageContent = {
    bounds,
    images: [],
    vectors: [],
    lines: [],
    topLines: [],
  };
  const topEdge = bounds[1] + height(bounds) * 0.25;
  const text = page.toStructuredText("preserve-images,vectors");
  let line: string | null = null;
  try {
    text.walk({
      onImageBlock: (bbox) => {
        if (width(bbox) >= MIN_RASTER_PT && height(bbox) >= MIN_RASTER_PT) {
          content.images.push(bbox);
        }
      },
      onVector: (bbox, flags: { isRectangle?: boolean }) => {
        const band =
          flags?.isRectangle &&
          width(bbox) > width(bounds) * MAX_BAND_WIDTH;
        if (!band) content.vectors.push(bbox);
      },
      beginLine: (bbox) => {
        content.lines.push(bbox);
        line = bbox[1] < topEdge ? "" : null;
      },
      onChar: (c) => {
        if (line !== null) line += c;
      },
      endLine: () => {
        if (line?.trim()) content.topLines.push(line.trim());
      },
    });
  } finally {
    text.destroy();
  }
  return content;
}

/** Running header of a judges' packet, which some years append to the student packet. */
const JUDGE_PACKET = /judge(?:'|\u2019)?s\s+packet/i;

/**
 * The 0-based pages each problem occupies: from the page carrying its
 * "N. Name" heading up to the page before the next problem's heading, or
 * before the first page of an appended judges' packet. Problems whose
 * heading isn't found are left out.
 */
function problemPages(
  contents: PageContent[],
  numbers: number[],
): Map<number, number[]> {
  const wanted = new Set(numbers);
  const starts: Array<{ number: number; page: number }> = [];
  const judgePages: number[] = [];
  contents.forEach((content, page) => {
    if (content.topLines.some((line) => JUDGE_PACKET.test(line))) {
      judgePages.push(page);
      return;
    }
    for (const line of content.topLines) {
      const n = Number(/^(\d{1,2})\.\s+\S/.exec(line)?.[1]);
      if (wanted.has(n) && !starts.some((s) => s.number === n)) {
        starts.push({ number: n, page });
        break;
      }
    }
  });
  starts.sort((a, b) => a.page - b.page);

  const pages = new Map<number, number[]>();
  starts.forEach(({ number, page }, i) => {
    const end = Math.min(
      starts[i + 1]?.page ?? contents.length,
      ...judgePages.filter((p) => p > page),
    );
    pages.set(
      number,
      Array.from({ length: Math.max(1, end - page) }, (_, k) => page + k),
    );
  });
  return pages;
}

/**
 * Underlines and strike-throughs: thin strokes lying within a single text
 * line. Table rules extend past the text in their cells, so they don't match.
 */
function isTextDecoration(content: PageContent, r: Rect): boolean {
  if (height(r) > 2 && width(r) > 2) return false;
  return content.lines.some(
    (l) => r[0] >= l[0] - 1 && r[2] <= l[2] + 1 && r[1] >= l[1] - 2 && r[3] <= l[3] + 2,
  );
}

/** Whether two rects overlap or lie within `gap` points of each other. */
function touches(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a[0] <= b[2] + gap &&
    b[0] <= a[2] + gap &&
    a[1] <= b[3] + gap &&
    b[1] <= a[3] + gap
  );
}

/**
 * The vector paths that make up the drawing under `guess`: every path
 * touching the box, plus every path connected to those through a chain of
 * touching paths. A diagram's lines and boxes join up, so this reaches the
 * whole drawing even where the box clips it. Separate decoration such as the
 * page header bar is not connected and stays out. Page-sized frames are
 * ignored, since they would connect everything.
 */
function connectedVectors(content: PageContent, guess: Rect): Rect[] {
  const pageArea = area(content.bounds);
  const candidates = content.vectors.filter(
    (r) => area(r) < pageArea * 0.6 && !isTextDecoration(content, r),
  );

  const cluster: Rect[] = [];
  let frontier = candidates.filter((r) => touches(r, guess));
  let rest = candidates.filter((r) => !touches(r, guess));

  while (frontier.length > 0) {
    cluster.push(...frontier);
    const reached = frontier;
    frontier = rest.filter((r) => reached.some((c) => touches(r, c, 2)));
    rest = rest.filter((r) => !frontier.includes(r));
  }

  return cluster;
}

/**
 * How far a label may sit from the drawing or from another label, in PDF
 * points. Labels beside a drawing (row headers) sit farther out than labels
 * above or below it (column headers, captions), and body text above or below
 * a figure is separated by more than a line gap.
 */
const LABEL_SIDE_GAP_PT = 40;
const LABEL_STACK_GAP_PT = 12;

function isLabelOf(line: Rect, target: Rect): boolean {
  const besides = line[1] <= target[3] && target[1] <= line[3];
  const stacked = line[0] <= target[2] && target[0] <= line[2];
  const hGap = Math.max(target[0] - line[2], line[0] - target[2], 0);
  const vGap = Math.max(target[1] - line[3], line[1] - target[3], 0);
  return (
    (besides && hGap <= LABEL_SIDE_GAP_PT) ||
    (stacked && vGap <= LABEL_STACK_GAP_PT)
  );
}

/**
 * The drawing plus its labels: text lines at or near the model's box that sit
 * beside or directly above or below the drawing, or another such label (axis
 * names, row and column headers, captions). Body text stays out even when the
 * box takes it in: it is farther away or much wider than the drawing. So does
 * a page number the box sloppily includes.
 */
function withLabels(content: PageContent, guess: Rect, drawing: Rect[]): Rect {
  const cluster = [...drawing];
  // Labels just outside a tight box still belong to the drawing. A line much
  // wider than the drawing is body text running past it, not a label.
  const maxWidth = width(union(drawing)) * 1.25;
  let rest = content.lines.filter(
    (l) => touches(l, guess, LABEL_STACK_GAP_PT) && width(l) <= maxWidth,
  );
  for (;;) {
    const near = rest.filter((l) => cluster.some((c) => isLabelOf(l, c)));
    if (near.length === 0) break;
    cluster.push(...near);
    rest = rest.filter((l) => !near.includes(l));
  }
  return union(cluster);
}

/** The model's box in PDF points on its page. */
function boxToRect(content: PageContent, box: FigureLocation["box"]): Rect {
  const [px0, py0] = content.bounds;
  const pw = width(content.bounds);
  const ph = height(content.bounds);
  return [
    px0 + (Math.min(box.x0, box.x1) / GRID) * pw,
    py0 + (Math.min(box.y0, box.y1) / GRID) * ph,
    px0 + (Math.max(box.x0, box.x1) / GRID) * pw,
    py0 + (Math.max(box.y0, box.y1) / GRID) * ph,
  ];
}

interface Raster {
  page: number;
  rect: Rect;
}

/** Where one figure will be rendered from. */
interface Placement {
  page: number;
  region: Rect;
  /** Whether `region` is approximate and should get {@link PADDING_PT} */
  pad: boolean;
}

/**
 * Decides which part of the packet each of a problem's figures is rendered
 * from.
 *
 * Model boxes are good at "which figure, roughly where" but can be a few
 * percent off, or (with weaker vision models) miss the figure entirely. The
 * page's own content is exact, and UIL figures are almost always raster
 * screenshots pasted into the packet, so:
 *
 * 1. A box that mostly covers raster images is cropped tightly to them. A
 *    box lying inside a single raster is cropped to its part of it.
 * 2. Figures still unplaced take the problem's remaining rasters in
 *    document order, so a misplaced box still finds its figure.
 * 3. Failing that, a box over a vector drawing is cropped to the whole
 *    drawing and the labels next to it, however loose or clipped the box.
 *    Line-wide bands (shading behind code or ASCII art) don't count as
 *    drawings, so a box over sample output still matches nothing.
 *
 * A figure that matches none of these is left out: its box covers nothing
 * but text, and rendering it would only produce a misleading screenshot.
 */
function placeFigures(
  contents: PageContent[],
  pages: number[] | undefined,
  figures: FigureLocation[],
): { placed: Map<number, Placement>; unused: Raster[] } {
  const onPage = (page: number): Raster[] =>
    contents[page]?.images.map((rect) => ({ page, rect })) ?? [];
  const rasters = (pages ?? []).flatMap(onPage);
  const claimed = new Set<Rect>();
  const placed = new Map<number, Placement>();
  const ordered = [...figures].sort((a, b) => a.figure - b.figure);

  for (const figure of ordered) {
    const page = figure.page - 1;
    const content = contents[page];
    if (!content) continue;
    const guess = boxToRect(content, figure.box);
    const hits = onPage(page).filter(
      ({ rect }) =>
        !claimed.has(rect) && area(intersect(rect, guess)) / area(rect) >= 0.5,
    );
    if (hits.length === 0) {
      // A box well inside one raster picks out a panel of a composite
      // image, e.g. one of three clocks pasted as a single picture.
      const host = onPage(page).find(
        ({ rect }) => area(intersect(rect, guess)) / area(guess) >= 0.8,
      );
      if (host) {
        claimed.add(host.rect);
        placed.set(figure.figure, {
          page,
          region: intersect(host.rect, grow(guess, PADDING_PT)),
          pad: false,
        });
      }
      continue;
    }
    for (const { rect } of hits) claimed.add(rect);
    placed.set(figure.figure, {
      page,
      region: union(hits.map((h) => h.rect)),
      pad: false,
    });
  }

  for (const figure of ordered) {
    if (placed.has(figure.figure)) continue;
    const next = rasters.find(({ rect }) => !claimed.has(rect));
    if (next) {
      claimed.add(next.rect);
      placed.set(figure.figure, { page: next.page, region: next.rect, pad: false });
      continue;
    }

    const page = figure.page - 1;
    const content = contents[page];
    if (!content) continue;
    const guess = boxToRect(content, figure.box);
    const drawing = connectedVectors(content, guess);
    if (drawing.length > 0) {
      placed.set(figure.figure, {
        page,
        region: withLabels(content, guess, drawing),
        pad: true,
      });
    }
  }

  return {
    placed,
    unused: rasters.filter(({ rect }) => !claimed.has(rect)),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders every located figure out of the student packet as a PNG.
 *
 * `problems` pairs each problem number with the figure locations the PDF
 * extraction reported. The result maps problem number → captured figures,
 * one per placeholder that could be rendered. A figure that can't be placed
 * (see {@link placeFigures}) is skipped, which leaves its placeholder for the
 * admin to fill in by hand.
 *
 * mupdf is WASM and is loaded on first use, so packets without figures never
 * pay its start-up cost.
 */
export async function captureFigures(
  pdf: Buffer,
  problems: Array<{ number: number; figures: FigureLocation[] }>,
): Promise<Map<number, CapturedFigure[]>> {
  const captured = new Map<number, CapturedFigure[]>();
  if (problems.every((p) => p.figures.length === 0)) return captured;

  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  const pages: Page[] = [];

  try {
    // Every page is read: finding where each problem starts needs them all.
    for (let i = 0; i < doc.countPages(); i++) pages.push(doc.loadPage(i));
    const contents = pages.map(readPage);
    const pagesOf = problemPages(
      contents,
      problems.map((p) => p.number),
    );

    for (const { number, figures } of problems) {
      if (figures.length === 0) continue;
      const { placed, unused } = placeFigures(
        contents,
        pagesOf.get(number),
        figures,
      );
      if (unused.length > 0) {
        console.warn(
          `[extract] problem ${number}: ${unused.length} image(s) on pages ` +
            `${[...new Set(unused.map((r) => r.page + 1))].join(", ")} ` +
            "are not referenced by any figure placeholder.",
        );
      }

      const out: CapturedFigure[] = [];
      for (const [figureNumber, { page, region: found, pad }] of placed) {
        const region = intersect(
          pad ? grow(found, PADDING_PT) : found,
          contents[page]!.bounds,
        );
        if (width(region) < 8 || height(region) < 8) continue;

        const scale = Math.min(
          RENDER_SCALE,
          MAX_EDGE_PX / Math.max(width(region), height(region)),
        );
        const pixmap = new mupdf.Pixmap(
          mupdf.ColorSpace.DeviceRGB,
          [
            Math.floor(region[0] * scale),
            Math.floor(region[1] * scale),
            Math.ceil(region[2] * scale),
            Math.ceil(region[3] * scale),
          ],
          false,
        );
        try {
          pixmap.clear(255);
          const device = new mupdf.DrawDevice(
            mupdf.Matrix.scale(scale, scale),
            pixmap,
          );
          try {
            pages[page]!.run(device, mupdf.Matrix.identity);
            device.close();
          } finally {
            device.destroy();
          }

          out.push({
            placeholder: figurePlaceholder(figureNumber),
            filename: `problem-${number}-figure-${figureNumber}.png`,
            data: Buffer.from(pixmap.asPNG()),
            mimeType: "image/png",
            width: pixmap.getWidth(),
            height: pixmap.getHeight(),
          });
        } finally {
          pixmap.destroy();
        }
      }

      out.sort(
        (a, b) => figureNumber(a.placeholder) - figureNumber(b.placeholder),
      );
      if (out.length > 0) captured.set(number, out);
    }
  } finally {
    for (const page of pages) page.destroy();
    doc.destroy();
  }

  return captured;
}
