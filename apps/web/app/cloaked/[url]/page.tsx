import {
  GOOGLE_FAVICON_URL,
  constructMetadata,
  getApexDomain,
} from "@dub/utils";
import { getMetaTags } from "app/api/metatags/utils";

export const runtime = "edge";
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ url: string }>;
}) {
  let { url } = await params;

  url = decodeURIComponent(url); // key can potentially be encoded

  const metatags = await getMetaTags(url);

  const apexDomain = getApexDomain(url);

  return constructMetadata({
    title: metatags.title,
    description: metatags.description,
    image: metatags.image,
    icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
    noIndex: true,
  });
}

export default async function CloakedPage({
  params,
}: {
  params: Promise<{ url: string }>;
}) {
  let { url } = await params;

  url = decodeURIComponent(url);

  return <iframe src={url} className="min-h-screen w-full border-none" />;
}
