import {
  DomainSchema,
  RegisteredDomainSchema,
} from "@/lib/zod/schemas/domains";
import { Domain } from "@dub/prisma/client";
import { z } from "zod";

type RegisteredDomain = z.infer<typeof RegisteredDomainSchema>;

export const transformDomain = (
  domain: Domain & { registeredDomain: RegisteredDomain | null },
) => {
  return DomainSchema.parse({
    ...domain,
    assetLinks: domain.assetLinks ? JSON.stringify(domain.assetLinks) : null,
    appleAppSiteAssociation: domain.appleAppSiteAssociation
      ? JSON.stringify(domain.appleAppSiteAssociation)
      : null,
  });
};
