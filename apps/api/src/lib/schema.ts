import { z } from "@hono/zod-openapi";

export const ProjectParamSchema = z.object({
  projectSlug: z.string().openapi({
    description:
      "The slug for the project that the link belongs to. E.g. for app.dub.co/acme, the projectSlug is 'acme'.",
  }),
});
