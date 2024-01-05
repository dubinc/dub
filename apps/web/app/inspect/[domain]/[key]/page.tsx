import { getLinkViaEdge } from "@/lib/planetscale";
import {
  Background,
  Footer,
  LinkPreview,
  LinkPreviewPlaceholder,
  Nav,
} from "@dub/ui";
import { HOME_DOMAIN, constructMetadata } from "@dub/utils";
import { notFound } from "next/navigation";
import LinkInspectorCard from "./card";
import { Suspense } from "react";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const domain = params.domain;
  const key = decodeURIComponent(params.key).slice(0, -1);

  const data = await getLinkViaEdge(domain, key);

  if (!data) {
    return;
  }

  return constructMetadata({
    title:
      "Link Inspector - Inspect a Short Link on Dub to Make Sure It's Safe",
    description:
      "Dub's Link Inspector is a simple tool for inspecting short links on Dub to make sure it's safe to click on. If you think this link is malicious, please report it.",
    noIndex: true,
  });
}

export default async function InspectPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const domain = params.domain;
  const key = decodeURIComponent(params.key).slice(0, -1);

  const data = await getLinkViaEdge(domain, key);

  // if the link doesn't exist
  if (!data) {
    notFound();
  }

  return (
    <>
      <main className="flex min-h-screen flex-col justify-between">
        <Nav />
        <div className="mx-2 my-10 flex max-w-md flex-col space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-16">
          <h1 className="font-display text-5xl font-extrabold leading-[1.15] text-black sm:text-6xl sm:leading-[1.15]">
            Link Inspector
          </h1>
          <h2 className="text-lg text-gray-600 sm:text-xl">
            Inspect a short link on Dub to make sure it's safe to click on. If
            you think this link is malicious, please report it.
          </h2>

          <LinkInspectorCard domain={domain} _key={key} url={data.url} />
          <Suspense fallback={<LinkPreviewPlaceholder />}>
            <LinkPreview defaultUrl={data.url} />
          </Suspense>
          <a
            href={`${HOME_DOMAIN}/tools/inspector`}
            rel="noreferrer"
            target="_blank"
            className="mx-auto mt-2 flex items-center justify-center space-x-2 text-sm text-gray-500 transition-all hover:text-black"
          >
            Inspect another short link →
          </a>
        </div>
        <Footer />
        <Background />
      </main>
    </>
  );
}
