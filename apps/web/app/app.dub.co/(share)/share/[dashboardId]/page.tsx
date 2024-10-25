import { prismaEdge } from "@/lib/prisma/edge";
import Analytics from "@/ui/analytics";
import { constructMetadata } from "@dub/utils";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { dashboardId: string };
}) {
  const data = await prismaEdge.sharedDashboard.findUnique({
    where: {
      id: params.dashboardId,
    },
    include: {
      link: true,
    },
  });

  // if the link doesn't exist or is explicitly private (publicStats === false)
  if (!data?.link) {
    return;
  }

  return constructMetadata({
    title: `Analytics for ${data.link.domain}/${data.link.key} – ${process.env.NEXT_PUBLIC_APP_NAME}`,
    image: `https://app.dub.co/api/og/analytics?domain=${data.link.domain}&key=${data.link.key}`,
    noIndex: true,
  });
}

export default async function SharePage({
  params,
}: {
  params: { dashboardId: string };
}) {
  const data = await prismaEdge.sharedDashboard.findUnique({
    where: {
      id: params.dashboardId,
    },
    include: {
      link: true,
    },
  });

  if (!data?.link) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="h-screen w-full bg-gray-50" />}>
      <Analytics
        staticDomain={data.link.domain}
        staticKey={data.link.key}
        staticUrl={data.link.url}
      />
    </Suspense>
  );
}
