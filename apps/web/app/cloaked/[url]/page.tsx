import {
  GOOGLE_FAVICON_URL,
  constructMetadata,
  getApexDomain,
} from "@dub/utils";
import { getMetaTags } from "app/api/links/metatags/utils";
import { notFound } from "next/navigation";

function getCloakedDestinationUrl(param: string): string {
  // Next.js decodes dynamic route segments once. Only decode again when the
  // param is still fully encoded.
  if (/^https?%3A/i.test(param)) {
    try {
      return decodeURIComponent(param);
    } catch {
      return param;
    }
  }

  return param;
}

function isSafeCloakedDestinationUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export async function generateMetadata(props: {
  params: Promise<{ url: string }>;
}) {
  const params = await props.params;
  const url = getCloakedDestinationUrl(params.url);

  if (!isSafeCloakedDestinationUrl(url)) {
    return constructMetadata({
      title: "Invalid link",
      noIndex: true,
    });
  }

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

  if (!isSafeCloakedDestinationUrl(url)) {
    notFound();
  }

  return <iframe src={url} className="min-h-screen w-full border-none" />;
}
