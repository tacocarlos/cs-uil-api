import { eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { problemImage } from "@/server/db/schemas/core-schema";
import { deleteUploadThingKeys } from "@/lib/upload-text";
import {
  figureNumber,
  PLACEHOLDER_PATTERN,
  type ProblemImage,
  type ProblemImageMap,
} from "@/lib/problem-images";

/** Every figure stored for a problem, in placeholder order. */
export async function getProblemImages(
  problemId: number,
): Promise<ProblemImage[]> {
  const rows = await db
    .select({
      placeholder: problemImage.placeholder,
      url: problemImage.url,
      key: problemImage.storage_key,
      width: problemImage.width,
      height: problemImage.height,
    })
    .from(problemImage)
    .where(eq(problemImage.problem, problemId));

  // Numeric order: figure 10 belongs after figure 9.
  return rows.sort(
    (a, b) => figureNumber(a.placeholder) - figureNumber(b.placeholder),
  );
}

/** placeholder → URL for a problem, as served to API clients. */
export async function getProblemImageMap(
  problemId: number,
): Promise<ProblemImageMap> {
  const rows = await db
    .select({ placeholder: problemImage.placeholder, url: problemImage.url })
    .from(problemImage)
    .where(eq(problemImage.problem, problemId));
  return Object.fromEntries(rows.map((r) => [r.placeholder, r.url]));
}

/**
 * Makes `images` the complete set of figures for a problem.
 *
 * Rows that are gone or now point at a different file are removed, and their
 * files are deleted from storage afterwards (best-effort, so a storage outage
 * never fails the save). Images with a malformed placeholder are rejected
 * rather than stored, since clients could never resolve them.
 */
export async function setProblemImages(
  problemId: number,
  images: readonly ProblemImage[],
): Promise<void> {
  const invalid = images.find((img) => !PLACEHOLDER_PATTERN.test(img.placeholder));
  if (invalid) {
    throw new Error(`Invalid figure placeholder "${invalid.placeholder}".`);
  }

  const existing = await db
    .select({ key: problemImage.storage_key, provider: problemImage.storage_provider })
    .from(problemImage)
    .where(eq(problemImage.problem, problemId));

  await db.batch([
    db.delete(problemImage).where(eq(problemImage.problem, problemId)),
    ...images.map((img) =>
      db.insert(problemImage).values({
        problem: problemId,
        placeholder: img.placeholder,
        url: img.url,
        storage_key: img.key,
        width: img.width,
        height: img.height,
      }),
    ),
  ]);

  const kept = new Set(images.map((img) => img.key));
  await deleteUploadThingKeys(
    existing
      .filter((row) => row.provider === "uploadthing" && !kept.has(row.key))
      .map((row) => row.key),
  );
}

/**
 * Deletes every figure belonging to `problemIds`, rows first and then files.
 * Call before deleting the problems themselves.
 */
export async function deleteImagesForProblems(
  problemIds: number[],
): Promise<void> {
  if (problemIds.length === 0) return;

  const rows = await db
    .delete(problemImage)
    .where(inArray(problemImage.problem, problemIds))
    .returning({
      key: problemImage.storage_key,
      provider: problemImage.storage_provider,
    });

  await deleteUploadThingKeys(
    rows.filter((row) => row.provider === "uploadthing").map((row) => row.key),
  );
}
