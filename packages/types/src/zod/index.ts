import { validDomainRegex } from "@dub/utils";
import * as z from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

export default z;

export const domainKeySchema = z.object({
  domain: z.string().refine((v) => validDomainRegex.test(v), {
    message: "Invalid domain format",
  }),
  key: z.string().min(1),
});

export const workspaceIdSchema = z.object({
  workspaceId: z
    .string()
    .min(1, "Workspace ID is required.")
    .describe("The ID of the workspace the link belongs to."),
});
