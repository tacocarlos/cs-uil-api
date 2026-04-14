import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

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
