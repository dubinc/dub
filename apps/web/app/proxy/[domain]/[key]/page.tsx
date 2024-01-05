import { getLinkViaEdge } from "@/lib/planetscale";
import {
  DUB_DESCRIPTION,
  DUB_THUMBNAIL,
  DUB_TITLE,
  GOOGLE_FAVICON_URL,
  constructMetadata,
  getApexDomain,
} from "@dub/utils";
import { unescape } from "html-escaper";
import { notFound, redirect } from "next/navigation";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const domain = params.domain;
  const key = decodeURIComponent(params.key); // key can potentially be encoded

  const data = await getLinkViaEdge(domain, key);

  if (!data?.proxy) {
    return;
  }

  const apexDomain = getApexDomain(data.url);

  const title = data.title ? unescape(data.title) : DUB_TITLE;
  const description = data.description
    ? unescape(data.description)
    : DUB_DESCRIPTION;
  const image = data.image ? unescape(data.image) : DUB_THUMBNAIL;

  return constructMetadata({
    title,
    description,
    image,
    icons: `${GOOGLE_FAVICON_URL}${unescape(apexDomain)}`,
    noIndex: true,
  });
}

export default async function ProxyPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const domain = params.domain;
  const key = decodeURIComponent(params.key);

  const data = await getLinkViaEdge(domain, key);

  // if the link doesn't exist
  if (!data) {
    notFound();

    // if the link does not have proxy enabled, redirect to the original URL
  } else if (data.proxy === false) {
    redirect(data.url);
  }

  const apexDomain = getApexDomain(data.url);

  const title = data.title ? unescape(data.title) : DUB_TITLE;
  const description = data.description
    ? unescape(data.description)
    : DUB_DESCRIPTION;
  const image = data.image ? unescape(data.image) : DUB_THUMBNAIL;

  return (
    <main className="flex h-screen w-screen items-center justify-center">
      <div className="mx-5 w-full max-w-lg overflow-hidden rounded-lg border border-gray-200 sm:mx-0">
        <img src={image} alt={title} className="w-full object-cover" />
        <div className="flex space-x-3 bg-gray-100 p-5">
          <img
            src={`${GOOGLE_FAVICON_URL}${unescape(apexDomain)}`}
            alt={title}
            className="mt-1 h-6 w-6"
          />
          <div className="flex flex-col space-y-3">
            <h1 className="font-bold text-gray-700">{title}</h1>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
