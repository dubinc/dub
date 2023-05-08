import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDomain } from "@/lib/utils";
import { getLinkViaEdge } from "@/lib/planetscale";
import Stats from "#/ui/stats";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { key: string };
}) {
  const domain = getDomain(headers());

  const data = await getLinkViaEdge(domain, params.key);

  if (!data || !data.publicStats) {
    return;
  }

  const title = `Stats for ${domain}/${params.key} - Dub`;
  const description = `Stats page for ${domain}/${params.key}, which redirects to ${data.url}.`;

  return {
    title,
    description,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@dubdotsh",
    },
  };
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
  const domain = getDomain(headers());
  const data = await getLinkViaEdge(domain, params.key);

  if (!data || !data.publicStats) {
    notFound();
  }

  return (
    <div className="bg-gray-50">
      <Stats staticDomain={domain} />
    </div>
  );
}
