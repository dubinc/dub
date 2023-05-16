import { notFound } from "next/navigation";
import { getLinkViaEdge } from "@/lib/planetscale";
import Stats from "#/ui/stats";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { key: string };
}) {
  const data = await getLinkViaEdge("dub.sh", params.key);

  if (!data || !data.publicStats) {
    return;
  }

  const title = `Stats for dub.sh/${params.key} - Dub`;
  const description = `Stats page for dub.sh/${params.key}, which redirects to ${data.url}.`;
  const image = `https://dub.sh/api/og/stats?domain=dub.sh&key=${params.key}`;

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
      <Stats staticDomain="dub.sh" />
    </div>
  );
}
