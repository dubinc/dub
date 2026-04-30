import { prisma } from "@dub/prisma";
import { APPSFLYER_INTEGRATION_ID } from "@dub/utils/src";
import { redirect } from "next/navigation";
import IntegrationPageClient from "./page-client";

export const revalidate = 0;

export default async function IntegrationPage(props: {
  params: Promise<{ slug: string; integrationSlug: string }>;
}) {
  const { slug: workspaceSlug, integrationSlug } = await props.params;

  // Being extra safe, we are fetching the integration and the installed integration separately
  const [integration, installedIntegration] = await Promise.all([
    prisma.integration.findUnique({
      where: {
        slug: integrationSlug,
      },
    }),

    prisma.installedIntegration.findFirst({
      where: {
        integration: {
          slug: integrationSlug,
        },
        project: {
          slug: workspaceSlug,
        },
      },
      select: {
        id: true,
        integrationId: true,
        userId: true,
        settings: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        webhooks: {
          select: {
            id: true,
          },
        },
      },
    }),
  ]);

  if (!integration || integration.comingSoon) {
    redirect(`/${workspaceSlug}/settings/integrations`);
  }

  if (integration.guideUrl && integration.id !== APPSFLYER_INTEGRATION_ID) {
    redirect(integration.guideUrl);
  }

  const settings = installedIntegration
    ? installedIntegration.settings
    : undefined;

  const webhookId = installedIntegration
    ? installedIntegration.webhooks[0]?.id
    : undefined;

  return (
    <IntegrationPageClient
      integration={{
        ...integration,
        screenshots: integration.screenshots as string[],
        installed: installedIntegration
          ? {
              id: installedIntegration.id,
              createdAt: installedIntegration.createdAt,
              by: {
                id: installedIntegration.userId,
                name: installedIntegration.user.name,
                email: installedIntegration.user.email,
                image: installedIntegration.user.image,
              },
            }
          : null,
        credentials: {}, // TODO: Fix this
        settings,
        webhookId,
      }}
    />
  );
}
