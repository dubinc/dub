import { prisma } from "@dub/prisma";
import { HUBSPOT_INTEGRATION_ID } from "@dub/utils/src";
import { redirect } from "next/navigation";
import IntegrationPageClient from "./page-client";

export const revalidate = 0;

export default async function IntegrationPage(
  props: {
    params: Promise<{ slug: string; integrationSlug: string }>;
  }
) {
  const params = await props.params;
  const integration = await prisma.integration.findUnique({
    where: {
      slug: params.integrationSlug,
    },
    include: {
      installations: {
        where: {
          project: {
            slug: params.slug,
          },
        },
        include: {
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
      },
    },
  });

  if (
    !integration ||
    (integration.comingSoon && integration.id !== HUBSPOT_INTEGRATION_ID)
  ) {
    redirect(`/${params.slug}/settings/integrations`);
  }

  if (integration.guideUrl) {
    redirect(integration.guideUrl);
  }

  const installed = integration.installations.length > 0;

  const credentials = installed
    ? integration.installations[0]?.credentials
    : undefined;

  const settings = installed
    ? integration.installations[0]?.settings
    : undefined;

  // TODO:
  // Fix this, we only displaying the first webhook only
  const webhookId = installed
    ? integration.installations[0]?.webhooks[0]?.id
    : undefined;

  return (
    <div className="mx-auto w-full max-w-screen-md">
      <IntegrationPageClient
        integration={{
          ...integration,
          screenshots: integration.screenshots as string[],
          installed: installed
            ? {
                id: integration.installations[0].id,
                by: {
                  id: integration.installations[0].userId,
                  name: integration.installations[0].user.name,
                  email: integration.installations[0].user.email,
                  image: integration.installations[0].user.image,
                },
                createdAt: integration.installations[0].createdAt,
              }
            : null,
          credentials,
          settings,
          webhookId,
        }}
      />
    </div>
  );
}
