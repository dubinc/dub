import { ZodOpenApiPathsObject } from "zod-openapi";
import { leadCreatedEvent } from "./lead-created";
import { saleCreatedEvent } from "./sale-created";

export const webhooksPaths: ZodOpenApiPathsObject = {
  leadCreated: {
    post: leadCreatedEvent,
  },
  saleCreated: {
    post: saleCreatedEvent,
  },
};
