import z from "@/lib/zod";
import {
  DomainSchema,
  RegisteredDomainSchema,
} from "@/lib/zod/schemas/domains";
import { Domain } from "@dub/prisma/client";

type RegisteredDomain = z.infer<typeof RegisteredDomainSchema>;

const DomainSchemaExtended = DomainSchema.extend({
  deepviewData: z.string().nullable(),
});

export const transformDomain = (
  domain: Domain & { registeredDomain: RegisteredDomain | null },
) => {
  return DomainSchemaExtended.parse({
    ...domain,
    assetLinks: domain.assetLinks ? JSON.stringify(domain.assetLinks) : null,
    appleAppSiteAssociation: domain.appleAppSiteAssociation
      ? JSON.stringify(domain.appleAppSiteAssociation)
      : null,
    deepviewData: domain.deepviewData
      ? JSON.stringify(domain.deepviewData)
      : null,
  });
};
