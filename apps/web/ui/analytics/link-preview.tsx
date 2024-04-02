import { LinkProps, UserProps } from "@/lib/types";
import { Avatar, BlurImage, CopyButton } from "@dub/ui";
import {
  GOOGLE_FAVICON_URL,
  cn,
  getApexDomain,
  linkConstructor,
  timeAgo,
  truncate,
} from "@dub/utils";
import { Archive, EyeOff, Globe } from "lucide-react";
import punycode from "punycode/";

export default function LinkPreviewTooltip({
  data,
}: {
  data: LinkProps & { user?: UserProps };
}) {
  const { url, rewrite, createdAt, archived, user } = data;
  const apexDomain = getApexDomain(url);

  return (
    <div className="relative flex w-[28rem] items-center justify-between px-4 py-2">
      <div className="relative flex shrink items-center">
        {archived ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
            <Archive className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
          </div>
        ) : url ? (
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={apexDomain}
            className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
            width={20}
            height={20}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 px-0 sm:h-10 sm:w-10">
            <Globe className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
          </div>
        )}
        {/* 
              Here, we're manually setting ml-* values because if we do space-x-* in the parent div, 
              it messes up the tooltip positioning.
            */}
        <div className="ml-2 sm:ml-4">
          <div className="flex max-w-fit items-center space-x-2">
            <a
              className={cn(
                "w-full max-w-[140px] truncate text-sm font-semibold text-blue-800 sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]",
                {
                  "text-gray-500": archived,
                },
              )}
              href={linkConstructor({ domain: data.domain, key: data.key })}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {truncate(
                linkConstructor({
                  domain: punycode.toUnicode(data.domain || ""),
                  key: data.key,
                  pretty: true,
                }),
                32,
              )}
            </a>
            <CopyButton
              value={linkConstructor({ domain: data.domain, key: data.key })}
            />
          </div>
          <div className="flex max-w-fit items-center space-x-1">
            {user && (
              <>
                <Avatar user={user} className="h-4 w-4" />
                <p>•</p>
              </>
            )}
            {createdAt && (
              <>
                <p
                  className="whitespace-nowrap text-sm text-gray-500"
                  suppressHydrationWarning
                >
                  {timeAgo(createdAt)}
                </p>
                <p>•</p>
              </>
            )}
            {rewrite && (
              <EyeOff className="xs:block hidden h-4 w-4 text-gray-500" />
            )}
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="xs:block hidden max-w-[240px] truncate text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
              >
                {url}
              </a>
            ) : (
              <p className="xs:block hidden max-w-[240px] truncate text-sm font-medium text-gray-700 underline-offset-2 hover:underline">
                No redirect configured
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
