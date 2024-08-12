import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import { prisma } from "@dub/prisma";
import { Suspense } from "react";
import IntegrationsPageClient from "./page-client";
import IntegrationsPageHeader from "./page-header";

export const revalidate = 300; // 5 minutes

export default async function IntegrationsPage() {
  return (
    <>
      <IntegrationsPageHeader />
      <Suspense fallback={<Loader />}>
        <Integrations />
      </Suspense>
    </>
  );
}

const Integrations = async () => {
  const integrations = await prisma.integration.findMany({
    where: {
      verified: true,
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
