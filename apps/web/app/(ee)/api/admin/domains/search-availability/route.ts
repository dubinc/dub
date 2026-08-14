import { getDomainSearchAvailability } from "@/lib/api/domains/get-domain-search-availability";
import { normalizeDomainInput } from "@/lib/api/domains/normalize-domain-input";
import { withAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const schema = z.object({
  domain: z
    .string()
    .min(1)
    .transform((domain) => {
      const normalized = normalizeDomainInput(domain);
      return normalized.endsWith(".link") ? normalized : `${normalized}.link`;
    }),
});

// GET /api/admin/domains/search-availability - search a .link domain (admin only)
export const GET = withAdmin(async ({ searchParams }) => {
  const parsed = schema.safeParse(searchParams);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { domain } = parsed.data;

  if (!domain) {
    return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
  }

  const response = await getDomainSearchAvailability(domain);

  return NextResponse.json(response);
});
