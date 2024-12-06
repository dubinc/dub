import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import IntegrationPageClient from "./page-client";

export const revalidate = 0;

export default async function IntegrationPage({
  params,
}: {
  params: { slug: string; integrationSlug: string };
}) {
  const integration = await prisma.integration.findUnique({
    where: {
      slug: params.integrationSlug,
    },
    include: {
      _count: {
        select: {
          installations: true,
        },
      },
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
              image: true,
            },
          },
          webhook: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!integration) {
    notFound();
  }

  const installed = integration.installations.length > 0;

  const credentials = installed
    ? integration.installations[0]?.credentials
    : undefined;

  const webhookId = installed
    ? integration.installations[0]?.webhook?.id
    : undefined;

  return (
    <IntegrationPageClient
      integration={{
        ...integration,
        screenshots: integration.screenshots as string[],
        installations: integration._count.installations,
        installed: installed
          ? {
              id: integration.installations[0].id,
              by: {
                id: integration.installations[0].userId,
                name: integration.installations[0].user.name,
                image: integration.installations[0].user.image,
              },
              createdAt: integration.installations[0].createdAt,
            }
          : null,
        credentials,
        webhookId,
      }}
    />
  );
}
