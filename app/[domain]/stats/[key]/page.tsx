import { notFound } from "next/navigation";
import { getLinkViaEdge } from "@/lib/planetscale";
import Stats from "#/ui/stats";

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

  const title = `Stats for ${params.domain}/${params.key} - Dub`;
  const description = `Stats page for ${params.domain}/${params.key}, which redirects to ${data.url}.`;
  const image = `https://${params.domain}/api/og/stats?domain=${params.domain}&key=${params.key}`;

  return {
    title,
    description,
    image,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image,
      creator: "@dubdotsh",
    },
  };
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
      <Stats staticDomain={params.domain} />
    </div>
  );
}
