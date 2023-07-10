import { notFound } from "next/navigation";
import Stats from "#/ui/stats";
import { Suspense } from "react";
import { getLinkViaEdge } from "#/lib/planetscale";
import { constructMetadata } from "#/lib/utils";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await getLinkViaEdge(params.domain, params.key);

  if (!data || !data.publicStats) {
    return;
  }

  return constructMetadata({
    title: `Stats for ${params.domain}/${params.key} - Dub`,
    description: `Stats page for ${params.domain}/${params.key}, which redirects to ${data.url}.`,
    image: `https://${params.domain}/api/og/stats?domain=${params.domain}&key=${params.key}`,
  });
}

export async function generateStaticParams() {
  return [
    {
      domain: "dub.sh",
      key: "github",
    },
  ];
}

export default async function StatsPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await getLinkViaEdge(params.domain, params.key);

  if (!data || !data.publicStats) {
    notFound();
  }

  return (
    <div className="bg-gray-50">
      <Suspense fallback={<div className="h-screen w-full bg-gray-50" />}>
        <Stats staticDomain={params.domain} />
      </Suspense>
    </div>
  );
}
