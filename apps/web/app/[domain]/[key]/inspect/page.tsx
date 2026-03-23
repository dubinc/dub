import { getLinkViaEdge } from "@/lib/planetscale";
import { Hero } from "@/ui/placeholders/hero";
import { LinkPreview, LinkPreviewPlaceholder } from "@dub/ui";
import {
  GOOGLE_FAVICON_URL,
  cn,
  constructMetadata,
  getApexDomain,
} from "@dub/utils";
import { unescape } from "html-escaper";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LinkInspectorCard from "./card";

export const runtime = "edge";

export async function generateMetadata(props: {
  params: Promise<{ domain: string; key: string }>;
}) {
  const params = await props.params;
  const domain = params.domain;
  const key = decodeURIComponent(params.key);

  const data = await getLinkViaEdge({ domain, key });

  if (!data) {
    return;
  }

  const apexDomain = getApexDomain(data.url);

  return constructMetadata({
    title: unescape(data.title || ""),
    description: unescape(data.description || ""),
    image: data.image,
    icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
    noIndex: true,
  });
}

export default async function InspectPage(props: {
  params: Promise<{ domain: string; key: string }>;
}) {
  const params = await props.params;
  const domain = params.domain;
  const key = decodeURIComponent(params.key);

  const data = await getLinkViaEdge({ domain, key });

  // if the link doesn't exist
  if (!data) {
    notFound();
  }

  return (
    <Hero className="sm:p-8">
      <div className="relative mx-auto flex w-full max-w-lg flex-col items-center">
        <h1
          className={cn(
            "font-display mt-10 text-center text-4xl font-medium text-neutral-900 sm:text-5xl sm:leading-[1.15]",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:20px] [animation-duration:1s] [animation-fill-mode:both]",
          )}
        >
          Link Inspector
        </h1>
        <p
          className={cn(
            "mt-5 text-pretty text-base text-neutral-700 sm:text-xl",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]",
          )}
        >
          Inspect a short link on Dub to make sure it&apos;s safe to click on.
          If you think this link is malicious, please report it.
        </p>
      </div>

      <div
        className={cn(
          "relative mx-auto mt-10 flex w-full max-w-lg flex-col items-center gap-5 px-2.5 sm:px-0",
          "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:5px] [animation-delay:300ms] [animation-duration:1s] [animation-fill-mode:both]",
        )}
      >
        <LinkInspectorCard domain={domain} _key={key} url={data.url} />
        <Suspense fallback={<LinkPreviewPlaceholder />}>
          <LinkPreview defaultUrl={data.url} />
        </Suspense>
        <a
          href="https://dub.co/tools/inspector"
          rel="noreferrer"
          target="_blank"
          className="flex items-center justify-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
        >
          Inspect another short link →
        </a>
      </div>
    </Hero>
  );
}
