import { LinkProps } from "@/lib/types";
import { CopyButton, LinkLogo } from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/src/icons";
import { getApexDomain, getPrettyUrl, linkConstructor } from "@dub/utils";

export default function LinkPreviewTooltip({ data }: { data: LinkProps }) {
  const { domain, key, url } = data;

  return (
    <div className="relative flex w-[28rem] items-center gap-x-2 px-4 py-2">
      <div className="relative flex-none rounded-full border border-gray-200 bg-gradient-to-t from-gray-100 pr-0.5 sm:p-2">
        <LinkLogo
          apexDomain={getApexDomain(url)}
          className="h-4 w-4 shrink-0 transition-[width,height] sm:h-6 sm:w-6 group-data-[variant=loose]/card-list:sm:h-5 group-data-[variant=loose]/card-list:sm:w-5"
        />
      </div>
      <div>
        <div className="min-w-0 shrink grow-0 text-gray-950">
          <div className="flex items-center gap-2">
            <a
              href={linkConstructor({ domain, key })}
              target="_blank"
              rel="noopener noreferrer"
              title={linkConstructor({ domain, key, pretty: true })}
              className="truncate text-sm font-semibold leading-6 text-gray-800 transition-colors hover:text-black"
            >
              {linkConstructor({ domain, key, pretty: true })}
            </a>
            <CopyButton
              value={linkConstructor({
                domain,
                key,
                pretty: false,
              })}
              variant="neutral"
              className="p-1.5"
            />
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-1 text-sm">
          <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-gray-400" />
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={url}
              className="max-w-[20rem] truncate text-gray-500 transition-colors hover:text-gray-700 hover:underline hover:underline-offset-2"
            >
              {getPrettyUrl(url)}
            </a>
          ) : (
            <span className="truncate text-gray-400">No URL configured</span>
          )}
        </div>
      </div>
    </div>
  );
}
