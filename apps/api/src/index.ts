import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { handleError, handleZodError } from "./lib/error";
import { getProjectApi } from "./routes/get-project";
import { healthCheckApi } from "./routes/health";

const port = 4000;

const app = new OpenAPIHono({
  defaultHook: handleZodError,
});

app.onError(handleError)

app.use("*", cors());
app.use("*", logger());

// Register routes
healthCheckApi(app);
getProjectApi(app);

// OpenAPI spec endpoint
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Dub.co API",
  },
  servers: [
    {
      url: "https://api.dub.co",
      description: "Production",
    },
  ],
});

console.log(`API server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
