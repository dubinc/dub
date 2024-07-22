import { getLinkViaEdge } from "@/lib/planetscale";
import { BlurImage } from "@dub/ui";
import {
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

  return constructMetadata({
    title: unescape(data.title || ""),
    description: unescape(data.description || ""),
    image: data.image,
    video: data.video,
    icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
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
  } else if (!data?.proxy) {
    redirect(data.url);
  }

  const apexDomain = getApexDomain(data.url);

  return (
    <main className="flex h-screen w-screen items-center justify-center">
      <div className="mx-5 w-full max-w-lg overflow-hidden rounded-lg border border-gray-200 sm:mx-0">
        <img
          src={data.image}
          alt={unescape(data.title || "")}
          className="w-full object-cover"
        />
        <div className="flex space-x-3 bg-gray-100 p-5">
          <BlurImage
            width={20}
            height={20}
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={unescape(data.title || "")}
            className="mt-1 h-6 w-6"
          />
          <div className="flex flex-col space-y-3">
            <h1 className="font-bold text-gray-700">
              {unescape(data.title || "")}
            </h1>
            <p className="text-sm text-gray-500">
              {unescape(data.description || "")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
