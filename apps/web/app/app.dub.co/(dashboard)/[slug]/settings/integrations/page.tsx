import { getFeatureFlags } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import { Suspense } from "react";
import IntegrationsPageClient from "./page-client";
import IntegrationsPageHeader from "./page-header";

export const revalidate = 300; // 5 minutes

export default async function IntegrationsPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <>
      <IntegrationsPageHeader />
      <Suspense fallback={<Loader />}>
        <Integrations workspaceSlug={params.slug} />
      </Suspense>
    </>
  );
}

const Integrations = async ({ workspaceSlug }: { workspaceSlug: string }) => {
  const flags = await getFeatureFlags({ workspaceSlug });

  const integrations = await prisma.integration.findMany({
    where: {
      verified: true,
      ...(!flags.conversions ? { slug: { notIn: ["stripe"] } } : {}),
    },
    include: {
      _count: {
        select: {
          installations: true,
        },
      },
    },
  });

  return (
    <IntegrationsPageClient
      integrations={integrations.map((integration) => ({
        ...integration,
        installations: integration._count.installations,
      }))}
    />
  );
};

const Loader = () => {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <OAuthAppPlaceholder key={i} />
      ))}
    </div>
  );
};
