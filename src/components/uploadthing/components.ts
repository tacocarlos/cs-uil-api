import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { ProblemFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<ProblemFileRouter>();
export const UploadDropzone = generateUploadDropzone<ProblemFileRouter>();
