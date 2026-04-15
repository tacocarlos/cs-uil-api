import { genUploader } from "uploadthing/client";
import type { ProblemFileRouter } from "./core";

export const { uploadFiles } = genUploader<ProblemFileRouter>();
