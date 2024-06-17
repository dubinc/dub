import { CopyButton, LinkLogo } from "@dub/ui";
import { getApexDomain, linkConstructor } from "@dub/utils";
import Script from "next/script";
import ReportButton from "./report";

export default function LinkInspectorCard({
  domain,
  _key,
  url,
}: {
  domain: string;
  _key: string;
  url: string;
}) {
  const key = _key;
  const apexDomain = getApexDomain(url);
  return (
    <>
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
      <div className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-3">
        <div className="flex items-center space-x-3">
          <LinkLogo apexDomain={apexDomain} />
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
              <CopyButton value={linkConstructor({ domain, key })} />
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-1 text-left text-sm text-gray-500 underline-offset-2 transition-all hover:text-gray-800 hover:underline"
            >
              {url}
            </a>
          </div>
        </div>
        <ReportButton link={linkConstructor({ domain, key })} />
      </div>
    </>
  );
}
