import { serve } from "@hono/node-server";

import { newHonoApp } from "./lib/hono";
import { getLinkApi } from "./routes/get-link";
import { getProjectApi } from "./routes/get-project";
import { getProjectsApi } from "./routes/get-projects";
import { getTagsApi } from "./routes/get-tags";
import { healthCheckApi } from "./routes/health";
import { createTagApi } from "./routes/create-tag";

const port = 4000;
const app = newHonoApp();

// Health
healthCheckApi(app);

// Projects
getProjectApi(app);
getProjectsApi(app);

// Tags
getTagsApi(app);
createTagApi(app)

// Links
getLinkApi(app);

console.log(`API server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
