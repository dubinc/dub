import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { User } from "@dub/database";
import { handleError, handleZodError } from "./errors";
import { validateApiKey } from "./middlewares/validateApiKey";
import { rateLimit } from "./middlewares/rateLimit";

export type HonoEnv = {
  Variables: {
    user: Pick<User, "id" | "name" | "email">;
  };
};

export function newHonoApp() {
  const app = new OpenAPIHono<HonoEnv>({
    defaultHook: handleZodError,
  });

  app.onError(handleError);

  app.use(prettyJSON());
  app.use("*", cors());
  app.use("*", logger());
  app.use("/api/v1/*", validateApiKey);
  // app.use("/api/v1/*", rateLimit);

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
    security: [
      {
        bearerAuth: [],
      },
    ],
  });

  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    bearerFormat: "API Token",
    scheme: "bearer",
    type: "http",
  });

  return app;
}

export type HonoApp = ReturnType<typeof newHonoApp>;
