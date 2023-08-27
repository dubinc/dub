import { GOOGLE_FAVICON_URL } from "#/lib/constants";
import { getLinkViaEdge } from "#/lib/planetscale";
import { constructMetadata, getApexDomain, linkConstructor } from "#/lib/utils";
import Footer from "#/ui/home/footer";
import Nav from "#/ui/home/nav";
import CopyButton from "@/components/shared/copy-button";
import { notFound } from "next/navigation";
import LinkPreview from "./preview";
import Background from "#/ui/home/background";
import BlurImage from "#/ui/blur-image";
import Script from "next/script";
import ReportButton from "./report";

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

  const apexDomain = getApexDomain(data.url);

  return (
    <>
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
      <main className="flex min-h-screen flex-col justify-between">
        <Nav />
        <div className="z-10 mx-2 my-10 flex max-w-md flex-col space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-16">
          <h1 className="font-display text-5xl font-extrabold leading-[1.15] text-black sm:text-6xl sm:leading-[1.15]">
            Link Inspector
          </h1>
          <h2 className="text-lg text-gray-600 sm:text-xl">
            Inspect a short link on Dub to make sure it's safe to click on. If
            you think this link is malicious, please report it.
          </h2>

          <div className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-3">
            <div className="flex items-center space-x-3">
              <BlurImage
                src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
                alt={apexDomain}
                className="pointer-events-none h-10 w-10 rounded-full"
                width={20}
                height={20}
              />
              <div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <a
                    className="font-semibold text-blue-800"
                    href={linkConstructor({ domain, key })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {linkConstructor({ domain, key, pretty: true })}
                  </a>
                  <CopyButton url={linkConstructor({ domain, key })} />
                </div>
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1 text-left text-sm text-gray-500 underline-offset-2 transition-all hover:text-gray-800 hover:underline"
                >
                  {data.url}
                </a>
              </div>
            </div>
            <ReportButton link={linkConstructor({ domain, key })} />
          </div>

          <LinkPreview url={data.url} />
        </div>
        <Footer />
        <Background />
      </main>
    </>
  );
}
