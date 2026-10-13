import { fetchTextContent } from "@/lib/fetch-text";
import { deleteUploadThingFiles, uploadTextFile } from "@/lib/upload-text";
import { INLINE_TEXT_LIMIT, type TextRef } from "@/lib/text-ref";

/** Reads a {@link TextRef} sent by the client. */
export async function resolveTextRef(ref: TextRef | undefined): Promise<string> {
  if (!ref) return "";
  if ("text" in ref) return ref.text;
  return fetchTextContent(ref.url);
}

/**
 * Packages server-produced text for the client: inline when small, otherwise
 * uploaded so the action response stays small. Throws if the upload fails —
 * silently dropping a generated output would be worse than an error.
 */
export async function toOutgoingTextRef(
  text: string,
  filename: string,
): Promise<TextRef> {
  if (text.length <= INLINE_TEXT_LIMIT) return { text };
  const url = await uploadTextFile(text, filename);
  if (!url) throw new Error(`Could not upload ${filename} to UploadThing.`);
  return { url };
}

/** Deletes the uploaded files behind refs that were never used. */
export async function discardTextRefs(refs: TextRef[]): Promise<void> {
  await deleteUploadThingFiles(
    refs.flatMap((ref) => ("url" in ref ? [ref.url] : [])),
  );
}
