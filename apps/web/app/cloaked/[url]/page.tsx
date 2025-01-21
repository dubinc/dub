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
  params: { url: string };
}) {
  const url = decodeURIComponent(params.url); // key can potentially be encoded

  const metatags = await getMetaTags(url);

  const apexDomain = getApexDomain(url);

  return constructMetadata({
    fullTitle: metatags.title,
    description: metatags.description,
    image: metatags.image,
    icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
    noIndex: true,
  });
}

export default function CloakedPage({ params }: { params: { url: string } }) {
  const url = decodeURIComponent(params.url);

  return <iframe src={url} className="min-h-screen w-full border-none" />;
}
