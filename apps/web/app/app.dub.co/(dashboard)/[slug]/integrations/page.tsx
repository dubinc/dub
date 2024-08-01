import { prisma } from "@/lib/prisma";
import OAuthAppPlaceholder from "@/ui/integrations/oauth-app-placeholder";
import { MaxWidthWrapper } from "@dub/ui";
import { Suspense } from "react";
import IntegrationsPageClient from "./page-client";
import PageHeader from "./page-header";

export const revalidate = 300; // 5 minutes

export default async function IntegrationsPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  return (
    <>
      <PageHeader slug={slug} />
      <MaxWidthWrapper className="flex flex-col gap-3 py-4">
        <Suspense fallback={<Loader />}>
          <Integrations slug={slug} />
        </Suspense>
      </MaxWidthWrapper>
    </>
  );
}

const Integrations = async ({ slug }: { slug: string }) => {
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
    },
  });

  return (
    <IntegrationsPageClient
      integrations={integrations.map((integration) => ({
        ...integration,
        installations: integration._count.authorizedApps,
      }))}
    />
  );
};

const Loader = () => {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <OAuthAppPlaceholder key={i} />
      ))}
    </div>
  );
};
