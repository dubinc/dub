import { prisma } from "@/lib/prisma";
import IntegrationsPageClient from "./page-client";

export default async function IntegrationsPage({
  params,
}: {
  params: { slug: string };
}) {
  const integrations = await prisma.oAuthApp.findMany({
    where: {
      verified: true,
    },
    include: {
      _count: {
        select: {
          authorizedApps: true,
        },
      },
      authorizedApps: {
        where: {
          project: {
            slug: params.slug,
          },
        },
      },
    },
  });

  return (
    <IntegrationsPageClient
      integrations={integrations.map((integration) => ({
        ...integration,
        redirectUris: integration.redirectUris as string[],
        installations: integration._count.authorizedApps,
        installed: integration.authorizedApps.length > 0,
      }))}
    />
  );
}
