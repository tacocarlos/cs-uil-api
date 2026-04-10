import { createRouteHandler } from "uploadthing/next";

import { problemFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: problemFileRouter,
});
