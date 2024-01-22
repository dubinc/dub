import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import { handleZodError } from "./lib/error";
import { createLinkApi } from "./routes/create-link";

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

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
  },
});

export default app;
