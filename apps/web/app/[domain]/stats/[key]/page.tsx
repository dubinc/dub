import { prismaEdge } from "@/lib/prisma/edge";
import { APP_DOMAIN } from "@dub/utils";
import { notFound, redirect } from "next/navigation";

export const runtime = "edge";

export default async function OldStatsPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const link = await prismaEdge.link.findUnique({
    where: {
      domain_key: {
        domain: params.domain,
        key: params.key,
      },
    },
    select: {
      sharedDashboard: true,
    },
  });

  if (!link?.sharedDashboard) {
    notFound();
  }

  redirect(`${APP_DOMAIN}/share/${link.sharedDashboard.id}`);
}
