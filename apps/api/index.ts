import { serve } from "@hono/node-server";

import { newHonoApp } from "./lib/hono";
import {
  createTagHandler,
  getLinksHandler,
  getProjectHandler,
  getProjectsHandler,
  getTagsHandler,
  healthCheckHandler,
} from "./routes";

const port = 4000;
const app = newHonoApp();

// Health
healthCheckHandler(app);

// Projects
getProjectHandler(app);
getProjectsHandler(app);

// Tags
getTagsHandler(app);
createTagHandler(app);

// Links
getLinksHandler(app);

console.log(`Dub API server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
