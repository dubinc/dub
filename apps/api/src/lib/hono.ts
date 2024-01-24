import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { User } from "@dub/database";
import { handleError, handleZodError } from "./error";
import { withAuth } from "./middlewares/authenticate";

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

  app.use(prettyJSON());
  app.use("*", cors());
  app.use("*", logger());
  app.use("*", withAuth);

  // app.use("/api/v1/projects/:projectSlug/*", async (c, next) => {
  //   const projectSlug = c.req.param("projectSlug");
  //   await withAuth(c, next, { projectSlug });
  // });

  return app;
}

export type HonoApp = ReturnType<typeof newHonoApp>;
