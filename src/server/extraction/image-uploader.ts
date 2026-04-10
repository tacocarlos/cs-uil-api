import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export interface UploadedImage {
  /** Original filename */
  filename: string;
  /** UploadThing file key */
  key: string;
  /** Public UFS URL */
  url: string;
}

/**
 * Upload an array of in-memory image buffers to UploadThing and return the
 * resulting file metadata for every successfully uploaded file.
 */
export async function uploadImages(
  images: Array<{ filename: string; data: Buffer; mimeType: string }>,
): Promise<UploadedImage[]> {
  if (images.length === 0) return [];

  const files = images.map(
    ({ data, filename, mimeType }) =>
      new File([new Uint8Array(data)], filename, { type: mimeType }),
  );

  const results = await utapi.uploadFiles(files);

  const uploaded: UploadedImage[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const image = images[i];

    if (result === undefined || image === undefined) continue;
    if (result.data === null) continue;

    uploaded.push({
      filename: image.filename,
      key: result.data.key,
      url: result.data.ufsUrl,
    });
  }

  return uploaded;
}
