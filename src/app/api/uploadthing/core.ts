import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/server/better-auth";
import { headers } from "next/headers";
const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const problemFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({
    pdf: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      const user = session?.user;
      if (user === undefined || user.role !== "admin")
        throw new UploadThingError("Unauthorized");

      // TODO: extend better auth session model to include role, allow only admin
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);

      // TODO: use AI to extract questions as markdown, returning it in the client metadata
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
  dataUploader: f({
    blob: {
      maxFileCount: 1,
      maxFileSize: "512MB",
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      const user = session?.user;
      if (user === undefined || user.role !== "admin")
        throw new UploadThingError("Unauthorized");

      // TODO: extend better auth session model to include role, allow only admin
      // TODO: unzip the file and add other files to upload
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);

      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
  textUploader: f({
    text: {
      maxFileCount: 1,
      maxFileSize: "512MB",
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: await headers() });
      const user = session?.user;
      if (user === undefined || user.role !== "admin") {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);

      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type ProblemFileRouter = typeof problemFileRouter;
