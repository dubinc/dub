import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import { handleZodError } from "./lib/error";
import { createLinkApi } from "./routes/create-link";
import { getProjectApi } from "./routes/get-project";

const app = new OpenAPIHono({
  defaultHook: handleZodError,
});

// app.use("*", async (c, next) => {
//   await next();
// });

app.use("*", cors());

app.get("/", (c) => {
  return c.text("Hello Hono! Kiran");
});

createLinkApi(app);
getProjectApi(app);

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
  },
});

export default app;
