import { DubApiError } from "@/lib/api/errors";
import { Prisma } from "@prisma/client";

const DOMAIN_JSON_CONFIG_LABELS = {
  assetLinks: "Asset Links",
  appleAppSiteAssociation: "Apple App Site Association",
  deepviewData: "Deep View data",
} as const;

type DomainJsonConfigField = keyof typeof DOMAIN_JSON_CONFIG_LABELS;

export function parseDomainJsonConfig({
  value,
  field,
}: {
  value: string | null | undefined;
  field: DomainJsonConfigField;
}): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return Prisma.DbNull;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Invalid ${DOMAIN_JSON_CONFIG_LABELS[field]}`,
    });
  }
}
