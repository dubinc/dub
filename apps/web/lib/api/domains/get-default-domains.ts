import { prisma } from "@/lib/prisma";
import { DUB_DOMAINS_ARRAY } from "@dub/utils";

export async function getDefaultDomains(
  workspaceId: string,
  { search }: { search?: string },
) {
  const defaultDomains = await prisma.defaultDomains.findUnique({
    where: {
      projectId: workspaceId,
    },
    select: {
      dubsh: true,
      dublink: true,
      chatgpt: true,
      sptifi: true,
      gitnew: true,
      amznid: true,
      ggllink: true,
      figpage: true,
      loooooooong: true,
    },
  });

  if (!defaultDomains) return [];

  const domains = Object.keys(defaultDomains)
    .filter((key) => defaultDomains[key])
    .map((domain) =>
      DUB_DOMAINS_ARRAY.find((d) => d.replace(".", "") === domain),
    );

  return search
    ? domains.filter((domain) =>
        domain?.toLowerCase().includes(search.toLowerCase()),
      )
    : domains;
}
