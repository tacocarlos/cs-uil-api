import { uploadFiles } from "@/app/api/uploadthing/client";
import { INLINE_TEXT_LIMIT, type TextRef } from "@/lib/text-ref";

/**
 * Uploaded URL per text content, so the same large field is uploaded once per
 * session however many times it is verified, generated against, or saved.
 * Bounded: only the most recent entries are kept.
 */
const uploads = new Map<string, Promise<string>>();
const MAX_CACHED = 24;

function remember(text: string, url: Promise<string>): void {
  uploads.delete(text);
  uploads.set(text, url);
  while (uploads.size > MAX_CACHED) {
    const oldest = uploads.keys().next().value;
    if (oldest === undefined) break;
    uploads.delete(oldest);
  }
}

/** Uploads `text` to UploadThing from the browser and returns its URL. */
export function uploadLargeText(text: string, filename: string): Promise<string> {
  const cached = uploads.get(text);
  if (cached) return cached;

  const pending = (async () => {
    const file = new File([text], filename, { type: "text/plain" });
    const [result] = await uploadFiles("textUploader", { files: [file] });
    if (!result?.ufsUrl) throw new Error(`Could not upload ${filename}.`);
    return result.ufsUrl;
  })();
  // Don't cache failures — a retry should try again.
  pending.catch(() => uploads.delete(text));
  remember(text, pending);
  return pending;
}

/** An already-uploaded URL for exactly this text, if this session has one. */
export function cachedUploadUrl(text: string): Promise<string> | undefined {
  return uploads.get(text);
}

/** Wraps a field for a server action: inline when small, uploaded otherwise. */
export async function toTextRef(text: string, filename: string): Promise<TextRef> {
  if (text.length <= INLINE_TEXT_LIMIT) return { text };
  return { url: await uploadLargeText(text, filename) };
}

/**
 * Reads a {@link TextRef} returned by a server action. A fetched URL is
 * remembered against its content, so saving that same text later reuses the
 * file instead of uploading it again.
 */
export async function readTextRef(ref: TextRef): Promise<string> {
  if ("text" in ref) return ref.text;
  const res = await fetch(ref.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not download output (HTTP ${res.status}).`);
  const text = await res.text();
  remember(text, Promise.resolve(ref.url));
  return text;
}
