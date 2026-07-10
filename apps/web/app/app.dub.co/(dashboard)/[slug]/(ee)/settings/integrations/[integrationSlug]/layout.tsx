import { prisma } from "@/lib/prisma";
import { ReactNode } from "react";
import { SetIntegrationsSubpageTitle } from "../integrations-subpage-context";

export default async function IntegrationSlugLayout({
  params,
  children,
}: {
  params: Promise<{ integrationSlug: string }>;
  children: ReactNode;
}) {
  const { integrationSlug } = await params;

  const integration = await prisma.integration.findUnique({
    where: {
      slug: integrationSlug,
    },
    select: {
      name: true,
    },
  });

  return (
    <>
      {integration ? (
        <SetIntegrationsSubpageTitle title={integration.name} />
      ) : null}
      {children}
    </>
  );
}
