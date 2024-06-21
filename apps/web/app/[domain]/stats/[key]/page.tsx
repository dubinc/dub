import { getLinkViaEdge } from "@/lib/planetscale";
import Analytics from "@/ui/analytics";
import { constructMetadata } from "@dub/utils";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await getLinkViaEdge(params.domain, params.key || "_root");

  // if the link doesn't exist or is explicitly private (publicStats === false)
  if (!data?.publicStats) {
    return;
  }

  return constructMetadata({
    title: `Analytics for ${params.domain}/${params.key} – ${process.env.NEXT_PUBLIC_APP_NAME}`,
    image: `https://${params.domain}/api/og/analytics?domain=${params.domain}&key=${params.key}`,
  });
}

export default async function StatsPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await getLinkViaEdge(params.domain, params.key || "_root");

  if (!data?.publicStats) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="h-screen w-full bg-gray-50" />}>
      <Analytics staticDomain={params.domain} staticUrl={data.url} />
    </Suspense>
  );
}
