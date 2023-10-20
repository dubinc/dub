import { redirect } from "next/navigation";

export default function OldStatsPage({
  params,
}: {
  params: {
    slug: string;
    domain: string;
    key?: string;
  };
}) {
  const { slug, domain, key } = params;
  redirect(`/${slug}/analytics?domain=${domain}${key ? `&key=${key}` : ""}`);
}
