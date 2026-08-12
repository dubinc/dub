import { DubApiError } from "@/lib/api/errors";

const DOMAIN_JSON_CONFIG_LABELS = {
  assetLinks: "Asset Links",
  appleAppSiteAssociation: "Apple App Site Association",
  deepviewData: "Deep View data",
} as const;

type DomainJsonConfigField = keyof typeof DOMAIN_JSON_CONFIG_LABELS;

export function parseDomainJsonConfig(
  value: string | null | undefined,
  field: DomainJsonConfigField,
) {
  if (value == null || value === "") {
    return value;
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
