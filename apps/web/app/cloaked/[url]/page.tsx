import {
  GOOGLE_FAVICON_URL,
  constructMetadata,
  getApexDomain,
} from "@dub/utils";
import { getMetaTags } from "app/api/links/metatags/utils";

export const runtime = "edge";

export async function generateMetadata(props: {
  params: Promise<{ url: string }>;
}) {
  const params = await props.params;
  const url = decodeURIComponent(params.url);
  const apexDomain = getApexDomain(url);

  try {
    const metatags = await getMetaTags(url);
    return constructMetadata({
      fullTitle: metatags.title,
      description: metatags.description,
      image: metatags.image,
      icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
      noIndex: true,
    });
  } catch {
    return constructMetadata({
      fullTitle: apexDomain,
      description: url,
      icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
      noIndex: true,
    });
  }
}

export default async function CloakedPage(props: {
  params: Promise<{ url: string }>;
}) {
  const params = await props.params;
  const url = decodeURIComponent(params.url);

  return <iframe src={url} className="min-h-screen w-full border-none" />;
}
