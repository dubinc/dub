import { createDocument } from "zod-openapi";
import { webhookEventSchema } from "../webhook/schemas";
import { DomainSchema } from "../zod/schemas/domains";
import { FolderSchema } from "../zod/schemas/folders";
import { LinkErrorSchema, LinkSchema } from "../zod/schemas/links";
import { LinkTagSchema } from "../zod/schemas/tags";
import { WorkspaceSchema } from "../zod/schemas/workspaces";
import { analyticsPath } from "./analytics";
import { commissionsPaths } from "./commissions";
import { customersPaths } from "./customers";
import { domainsPaths } from "./domains";
import { embedTokensPaths } from "./embed-tokens";
import { eventsPath } from "./events";
import { foldersPaths } from "./folders";
import { linksPaths } from "./links";
import { partnersPaths } from "./partners";
import { qrCodePaths } from "./qr";
import { openApiErrorResponsesComponents } from "./responses";
import { tagsPaths } from "./tags";
import { trackPaths } from "./track";
import { workspacesPaths } from "./workspaces";

export const document = createDocument({
  openapi: "3.0.3",
  info: {
    title: "Dub API",
    description:
      "Dub is the modern link attribution platform for short links, conversion tracking, and affiliate programs.",
    version: "0.0.1",
    contact: {
      name: "Dub Support",
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
    ...analyticsPath,
    ...eventsPath,
    ...tagsPaths,
    ...foldersPaths,
    ...domainsPaths,
    ...trackPaths,
    ...customersPaths,
    ...partnersPaths,
    ...commissionsPaths,
    ...workspacesPaths,
    ...embedTokensPaths,
    ...qrCodePaths,
  },
  components: {
    schemas: {
      LinkSchema,
      WorkspaceSchema,
      LinkTagSchema,
      FolderSchema,
      DomainSchema,
      webhookEventSchema,
      LinkErrorSchema,
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
      ...openApiErrorResponsesComponents,
    },
  },
});
