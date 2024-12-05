import { prismaEdge } from "@/lib/prisma/edge";
import { APP_DOMAIN } from "@dub/utils";
import { notFound, redirect } from "next/navigation";

export const runtime = "edge";

export default async function OldStatsPage({
  params,
}: {
  params: Promise<{ domain: string; key: string }>;
}) {
  const { domain, key } = await params;

  const link = await prismaEdge.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    select: {
      dashboard: true,
    },
  });

  if (!link?.dashboard) {
    notFound();
  }

  redirect(`${APP_DOMAIN}/share/${link.dashboard.id}`);
}
