import * as z from "zod/v4";

// Only fields rendered by `ui/domains/domain-configuration.tsx` are returned.
// Unknown keys from Vercel's responses are stripped.
const vercelDomainSchema = z.object({
  name: z.string().optional(),
  apexName: z.string().optional(),
  verified: z.boolean().optional(),
  verification: z
    .array(
      z.object({
        type: z.string().optional(),
        domain: z.string().optional(),
        value: z.string().optional(),
      }),
    )
    .optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

const vercelConfigSchema = z.object({
  misconfigured: z.boolean().optional(),
  conflicts: z
    .array(
      z.object({
        name: z.string().optional(),
        type: z.string().optional(),
        value: z.string().optional(),
      }),
    )
    .optional(),
});

export function serializeVerificationResponse({
  domainJson,
  configJson,
}: {
  domainJson: unknown;
  configJson: unknown;
}) {
  const domain = vercelDomainSchema.safeParse(domainJson);
  const config = vercelConfigSchema.safeParse(configJson);

  return {
    domainJson: domain.success ? domain.data : {},
    configJson: config.success ? config.data : {},
  };
}
