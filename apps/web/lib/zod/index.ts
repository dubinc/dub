import * as z from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

export default z;

export const domainKeySchema = z.object({
  domain: z.string().min(1),
  key: z.string().min(1),
});