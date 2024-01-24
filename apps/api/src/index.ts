import { serve } from "@hono/node-server";

import { newHonoApp } from "./lib/hono";
import { getLinkApi } from "./routes/get-link";
import { getProjectApi } from "./routes/get-project";
import { getProjectsApi } from "./routes/get-projects";
import { healthCheckApi } from "./routes/health";

const port = 4000;
const app = newHonoApp();

// Register routes
healthCheckApi(app);
getProjectApi(app);
getProjectsApi(app);
// getLinkApi(app);

console.log(`API server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
