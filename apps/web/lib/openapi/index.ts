import { createDocument } from "zod-openapi";

import { linkPaths } from "./links";
import { LinkSchema } from "@/lib/zod/schemas/links";
import { TagSchemaOpenApi, tagPaths } from "@/lib/zod/schemas/tags";
import { ProjectSchemaOpenApi, projectPaths } from "@/lib/zod/schemas/projects";

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
    ...linkPaths,
    // ...tagPaths,
    // ...projectPaths,
  },
  components: {
    schemas: {
      LinkSchema,
      TagSchemaOpenApi,
      ProjectSchemaOpenApi,
    },
  },
});
