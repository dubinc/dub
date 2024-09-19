import { openApiErrorResponses } from "@/lib/openapi/responses";
import { DomainSchema } from "@/lib/zod/schemas/domains";
import { LinkSchema } from "@/lib/zod/schemas/links";
import { TagSchema } from "@/lib/zod/schemas/tags";
import { WorkspaceSchema } from "@/lib/zod/schemas/workspaces";
import { createDocument } from "zod-openapi";
import { webhookEventSchema } from "../webhook/schemas";
import { analyticsPath } from "./analytics";
import { domainsPaths } from "./domains";
import { eventsPath } from "./events";
import { linksPaths } from "./links";
import { metatagsPath } from "./metatags";
import { qrCodePaths } from "./qr";
import { tagsPaths } from "./tags";
import { trackPaths } from "./track";
import { workspacesPaths } from "./workspaces";

export const document = createDocument({
  openapi: "3.0.3",
  info: {
    title: "Dub.co API",
    description:
      "Dub is link management infrastructure for companies to create marketing campaigns, link sharing features, and referral programs.",
    version: "0.0.1",
    contact: {
      name: "Dub.co Support",
      email: "support@dub.co",
      url: "https://dub.co/api",
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
    ...qrCodePaths,
    ...analyticsPath,
    ...eventsPath,
    ...workspacesPaths,
    ...tagsPaths,
    ...domainsPaths,
    ...trackPaths,
    ...metatagsPath,
  },
  components: {
    schemas: {
      LinkSchema,
      WorkspaceSchema,
      TagSchema,
      DomainSchema,
      webhookEventSchema,
    },
    securitySchemes: {
      token: {
        type: "http",
        description: "Default authentication mechanism",
        scheme: "bearer",
        "x-speakeasy-example": "DUB_API_KEY",
      },
    },
    responses: {
      ...openApiErrorResponses,
    },
  },
});
