import IntegrationCard from "@/ui/integrations/integration-card";
import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import { prisma } from "@dub/prisma";
import { Suspense } from "react";

export const revalidate = 300; // 5 minutes

export default function IntegrationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-12">
      <div className="">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          Integrations
        </h1>
        <p className="mb-2 mt-2 text-base text-neutral-600">
          Use Dub with your existing favorite tools with our seamless
          integrations.
        </p>
      </div>
      <Suspense fallback={<Loader />}>
        <Integrations />
      </Suspense>
    </div>
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
