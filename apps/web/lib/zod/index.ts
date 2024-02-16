import { validDomainRegex } from "@dub/utils";
import * as z from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

export default z;

export const domainSchema = z
  .string()
  .min(1)
  .refine((domain) => {
    const validDomain =
      validDomainRegex.test(domain) &&
      // make sure the domain doesn't contain dub.co/dub.sh
      !/^(dub\.co|.*\.dub\.co|dub\.sh|.*\.dub\.sh)$/i.test(domain);

    return validDomain;
  }, "Invalid domain");

export const domainKeySchema = z.object({
  domain: z.string().min(1),
  key: z.string().min(1),
});
