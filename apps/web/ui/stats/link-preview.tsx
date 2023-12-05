import { UserProps } from "@/lib/types";
import { Avatar, CopyButton } from "@dub/ui";
import {
  GOOGLE_FAVICON_URL,
  cn,
  fetcher,
  getApexDomain,
  linkConstructor,
  timeAgo,
} from "@dub/utils";
import { Link as LinkProps } from "@prisma/client";
import { Archive, EyeOff, Globe, Trash } from "lucide-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { BlurImage } from "../shared/blur-image";
import punycode from "punycode/";

export default function LinkPreviewTooltip({
  link,
}: {
  // link is in the format dub.sh/github
  link: string;
}) {
  const domain = link.split("/")[0];
  const key = link.split("/").slice(1).join("/");
  const { slug } = useParams() as { slug?: string };
  const { data, isLoading } = useSWR<
    LinkProps & {
      user: UserProps;
    }
  >(
    key
      ? `/api/links/info?domain=${domain}&key=${key}${
          slug ? `&projectSlug=${slug}` : ""
        }`
      : `/api/projects/${slug}/domains/${domain}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );
  if (isLoading) {
    return (
      <div className="relative flex w-[28rem] items-center px-4 py-2">
        <div className="mr-2 h-8 w-8 animate-pulse rounded-full bg-gray-200 sm:h-10 sm:w-10" />
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-40 animate-pulse rounded-md bg-gray-200" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
            <div className="h-5 w-48 animate-pulse rounded-md bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="relative flex w-[28rem] items-center space-x-3 px-4 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
          <Trash className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
        </div>
        <div className="flex flex-col space-y-1">
          <p className="w-full max-w-[140px] truncate text-sm font-semibold text-gray-500 line-through sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]">
            {linkConstructor({
              domain: punycode.toUnicode(domain || ""),
              key,
              pretty: true,
            })}
          </p>
          <p className="text-sm text-gray-500">This link has been deleted.</p>
        </div>
      </div>
    );
  }

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
              href={linkConstructor({ domain, key })}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {linkConstructor({
                domain: punycode.toUnicode(domain || ""),
                key,
                pretty: true,
              })}
            </a>
            <CopyButton value={linkConstructor({ domain, key })} />
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
