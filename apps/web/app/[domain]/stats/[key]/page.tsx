import { getDomainOrLink } from "@/lib/api/links";
import Stats from "@/ui/stats";
import { constructMetadata } from "@dub/utils";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await getDomainOrLink(params);

  // if the link doesn't exist or is explicitly private (publicStats === false)
  if (!data?.publicStats) {
    return;
  }

  return constructMetadata({
    title: `Analytics for ${params.domain}/${params.key} – ${process.env.NEXT_PUBLIC_APP_NAME}`,
    image: `https://${params.domain}/api/og/stats?domain=${params.domain}&key=${params.key}`,
  });
}

export default async function StatsPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await getDomainOrLink(params);

  if (!data?.publicStats) {
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
