import { UTApi } from "uploadthing/server";

import type { ProblemImage } from "@/lib/problem-images";

const utapi = new UTApi();

/** An in-memory figure waiting to be uploaded for a placeholder. */
export interface ImageToUpload {
  /** Markdown placeholder this image fills, e.g. "uil-cs-api-figure:1" */
  placeholder: string;
  filename: string;
  data: Buffer;
  mimeType: string;
  width: number | null;
  height: number | null;
}

/**
 * Upload an array of in-memory image buffers to UploadThing and return the
 * resulting file metadata for every successfully uploaded file.
 */
export async function uploadImages(
  images: ImageToUpload[],
): Promise<ProblemImage[]> {
  if (images.length === 0) return [];

  const files = images.map(
    ({ data, filename, mimeType }) =>
      new File([new Uint8Array(data)], filename, { type: mimeType }),
  );

  const results = await utapi.uploadFiles(files);

  const uploaded: ProblemImage[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const image = images[i];

    if (result === undefined || image === undefined) continue;
    if (result.data === null) continue;

    uploaded.push({
      placeholder: image.placeholder,
      key: result.data.key,
      url: result.data.ufsUrl,
      width: image.width,
      height: image.height,
    });
  }

  return uploaded;
}
