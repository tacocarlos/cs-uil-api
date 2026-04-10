import { createRouteHandler } from "uploadthing/next";

import { problemFileRouter } from "./core";

export default createRouteHandler({
  router: problemFileRouter,
});
