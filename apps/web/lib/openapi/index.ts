import { createDocument } from "zod-openapi";

import { linksPaths } from "./links";
import { tagsPaths } from "./tags";
import { projectsPaths } from "./projects";
import { LinkSchema } from "@/lib/zod/schemas/links";
import { TagSchema } from "@/lib/zod/schemas/tags";
import { ProjectSchema } from "@/lib/zod/schemas/projects";

export const openAPIDocument = createDocument({
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
      ProjectSchema,
      TagSchema,
    },
    securitySchemes: {
      bearerToken: {
        type: "http",
        description: "Default authentication mechanism",
        scheme: "bearer",
      },
    },
  },
});