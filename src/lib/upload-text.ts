import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

/**
 * Extracts the UploadThing file key from a UFS URL.
 *
 * Both URL formats are handled:
 *   https://utfs.io/f/{key}
 *   https://{appId}.ufs.sh/f/{key}
 *
 * Returns `null` when the URL is falsy or the key cannot be parsed.
 */
function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/f\/([^/?#]+)/);
  return match?.[1] ?? null;
}

/**
 * Deletes a batch of UploadThing files identified by their UFS URLs.
 *
 * Null / undefined entries and unparseable URLs are silently skipped.
 * Errors from UploadThing are logged but not re-thrown so that callers
 * can treat file cleanup as best-effort — a failed deletion should never
 * prevent the corresponding DB row from being removed.
 */
export async function deleteUploadThingFiles(
  urls: (string | null | undefined)[],
): Promise<void> {
  const keys = urls.map(keyFromUrl).filter((k): k is string => k !== null);

  if (keys.length === 0) return;

  try {
    await utapi.deleteFiles(keys);
  } catch (err) {
    console.error(
      "[deleteUploadThingFiles] failed to delete files:",
      keys,
      err,
    );
  }
}

/**
 * Uploads a string as a plain-text file to UploadThing via the server API.
 *
 * Returns the public `ufsUrl` of the uploaded file, or `null` when:
 *  - `content` is empty / whitespace-only (nothing to upload)
 *  - the upload fails for any reason
 */
export async function uploadTextFile(
  content: string,
  filename: string,
): Promise<string | null> {
  if (!content.trim()) return null;
  try {
    const file = new File([content], filename, { type: "text/plain" });
    const [result] = await utapi.uploadFiles([file]);
    return result?.data?.ufsUrl ?? null;
  } catch {
    return null;
  }
}
