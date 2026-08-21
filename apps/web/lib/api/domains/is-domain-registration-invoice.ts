import { prisma } from "@/lib/prisma";

export function parseRegisteredDomainSlugs(
  registeredDomains: unknown,
): string[] {
  if (!Array.isArray(registeredDomains)) return [];
  return registeredDomains.filter((d): d is string => typeof d === "string");
}

export async function isDomainRegistrationInvoice({
  slugs,
  workspaceId,
}: {
  slugs: string[];
  workspaceId: string;
}): Promise<boolean> {
  // premium domains can only be registered/renewed one at a time
  if (slugs.length !== 1) return false;

  const registeredDomain = await prisma.registeredDomain.findFirst({
    where: {
      slug: slugs[0],
      projectId: workspaceId,
    },
  });

  // if registered domain exists, it's a renewal (not a new domain registration)
  return registeredDomain ? false : true;
}
