import {
  GOOGLE_FAVICON_URL,
  constructMetadata,
  getApexDomain,
} from "@dub/utils";
import { getMetaTags } from "app/api/links/metatags/utils";

function getCloakedDestinationUrl(routeParam: string): string {
  const url =
    routeParam.includes("://") || !routeParam.includes("%")
      ? routeParam
      : decodeURIComponent(routeParam);

  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) {
    return url;
  }

  const base = url.slice(0, queryIndex);
  const query = url.slice(queryIndex + 1);

  const normalizedQuery = query
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) {
        return pair;
      }

      const key = pair.slice(0, eqIndex);
      const rawValue = pair.slice(eqIndex + 1);
      const value = decodeURIComponent(rawValue.replace(/\+/g, "%2B"));

      return `${key}=${encodeURIComponent(value)}`;
    })
    .join("&");

  return normalizedQuery ? `${base}?${normalizedQuery}` : base;
}

export async function generateMetadata(props: {
  params: Promise<{ url: string }>;
}) {
  const params = await props.params;
  const url = getCloakedDestinationUrl(params.url);

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

export default async function CloakedPage(props: {
  params: Promise<{ url: string }>;
}) {
  const params = await props.params;
  const url = getCloakedDestinationUrl(params.url);

  return <iframe src={url} className="min-h-screen w-full border-none" />;
}
