import { generateReactHelpers } from "@uploadthing/react";

import type { ProblemFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<ProblemFileRouter>();
