import { constructMetadata, getApexDomain } from "#/lib/utils";
import { GOOGLE_FAVICON_URL } from "#/lib/constants";
import { getMetaTags } from "@/pages/api/edge/metatags";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { url: string };
}) {
  const url = decodeURIComponent(params.url); // key can potentially be encoded

  const metatags = await getMetaTags(url);

  const apexDomain = getApexDomain(url);

  return constructMetadata({
    title: metatags.title,
    description: metatags.description,
    image: metatags.image || undefined,
    icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
    noIndex: true,
  });
}

export default async function RewritePage({
  params,
}: {
  params: { url: string };
}) {
  const url = decodeURIComponent(params.url);

  return <iframe src={url} className="min-h-screen w-full border-none" />;
}
