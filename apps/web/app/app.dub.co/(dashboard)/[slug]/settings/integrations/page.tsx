import IntegrationCard from "@/ui/integrations/integration-card";
import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import { prisma } from "@dub/prisma";
import { Suspense } from "react";
import IntegrationsPageHeader from "./page-header";

export const revalidate = 300; // 5 minutes

export default function IntegrationsPage() {
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
    orderBy: [
      {
        installations: {
          _count: "desc",
        },
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          {...integration}
          installations={integration._count.installations}
        />
      ))}
    </div>
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
