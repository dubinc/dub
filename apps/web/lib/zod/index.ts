import * as z from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

export default z;

export const workspaceIdSchema = z.object({
  workspaceId: z
    .string()
    .min(1, "Workspace ID is required.")
    .describe("The ID of the workspace the link belongs to."),
});
