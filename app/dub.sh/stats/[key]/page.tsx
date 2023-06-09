import { notFound } from "next/navigation";
import { getLinkViaEdge } from "#/lib/planetscale";
import Stats from "#/ui/stats";
import { Suspense } from "react";
import { Metadata } from "next";
import { constructMetadata } from "#/lib/utils";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { key: string };
}): Promise<Metadata | undefined> {
  const data = await getLinkViaEdge("dub.sh", params.key);

  if (!data || !data.publicStats) {
    return;
  }

  return constructMetadata({
    title: `Stats for dub.sh/${params.key} - Dub`,
    description: `Stats page for dub.sh/${params.key}, which redirects to ${data.url}.`,
    image: `https://dub.sh/api/og/stats?domain=dub.sh&key=${params.key}`,
  });
}

export async function generateStaticParams() {
  return [
    {
      key: "github",
    },
  ];
}

export default async function StatsPage({
  params,
}: {
  params: { key: string };
}) {
  const data = await getLinkViaEdge("dub.sh", params.key);

  if (!data || !data.publicStats) {
    notFound();
  }

  return (
    <div className="bg-gray-50">
      <Suspense fallback={<div className="h-screen w-full bg-gray-50" />}>
        <Stats staticDomain="dub.sh" />
      </Suspense>
    </div>
  );
}
