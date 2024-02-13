import { ZodOpenApiObject } from "zod-openapi";

import { LinkSchema } from "@/lib/zod/schemas/links";
import { projectSchema } from "@/lib/zod/schemas/projects";
import { tagSchema } from "@/lib/zod/schemas/tags";
import { linksPaths } from "./links";
import { projectsPaths } from "./projects";
import { tagsPaths } from "./tags";

export const openApiObject: ZodOpenApiObject = {
  openapi: "3.0.3",
  info: {
    title: "Dub.co API",
    description:
      "Dub is an open-source link management tool for modern marketing teams to create, share, and track short links.",
    version: "0.0.1",
    contact: {
      name: "Dub.co Support",
      email: "support@dub.co",
      url: "https://dub.co/help",
    },
    license: {
      name: "AGPL-3.0 license",
      url: "https://github.com/dubinc/dub/blob/main/LICENSE.md",
    },
  },
  servers: [
    {
      url: "https://api.dub.co",
      description: "Production API",
    },
  ],
  paths: {
    ...linksPaths,
    ...projectsPaths,
    ...tagsPaths,
  },
  components: {
    schemas: {
      LinkSchema,
      projectSchema,
      tagSchema,
    },
    securitySchemes: {
      bearerToken: {
        type: "http",
        description: "Default authentication mechanism",
        scheme: "bearer",
      },
    },
  },
};
