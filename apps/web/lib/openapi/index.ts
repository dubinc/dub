import { createDocument } from "zod-openapi";

import { tagSchema, tagPaths } from "../zod/schemas/tags";

export const openAPIDocument = createDocument({
  openapi: "3.0.0",
  info: {
    title: "Dub.co’s API",
    description: "",
    version: "1.0.0",
    contact: {
      name: "Dub Support",
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
      description: "Production",
    },
    {
      url: "http://localhost:8888",
      description: "Local",
    },
  ],
  paths: {
    ...tagPaths,
  },
  components: {
    schemas: {
      tagSchema,
    },
  },
});
