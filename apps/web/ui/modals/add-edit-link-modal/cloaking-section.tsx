import { LinkProps } from "@/lib/types";
import { AlertCircleFill, CheckCircleFill } from "@/ui/shared/icons";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { LoadingSpinner, SimpleTooltipContent, Switch } from "@dub/ui";
import {
  FADE_IN_ANIMATION_SETTINGS,
  fetcher,
  getUrlFromString,
} from "@dub/utils";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import useSWR from "swr";
import { useDebounce } from "use-debounce";

export default function CloakingSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { rewrite } = data;
  const [enabled, setEnabled] = useState(rewrite);
  useEffect(() => {
    if (enabled) {
      // if enabling, set rewrite to true or props.rewrite
      setData({
        ...data,
        rewrite: true,
      });
    } else {
      // if disabling, set rewrite to false
      setData({ ...data, rewrite: false });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">Link Cloaking</h2>
          <ProBadgeTooltip
            content={
              <SimpleTooltipContent
                title="Mask your destination URL so your users only see the short link in the browser address bar."
                cta="Learn more."
                href="https://dub.co/help/article/link-cloaking"
              />
            }
          />
        </div>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>

      {enabled && (
        <motion.div className="mt-3 grid gap-2" {...FADE_IN_ANIMATION_SETTINGS}>
          <div className="relative mt-1 flex aspect-[1200/630] w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm transition-all hover:bg-gray-50">
            <iframe
              src={getUrlFromString(data.url)}
              className="absolute z-10 h-full w-full"
            />
            <LoadingSpinner />
          </div>
          <IframeIndicator
            url={getUrlFromString(data.url)}
            domain={data.domain}
          />
        </motion.div>
      )}
    </div>
  );
}

function IframeIndicator({ url, domain }: { url: string; domain: string }) {
  const [debouncedUrl] = useDebounce(url, 500);
  const { data, isLoading } = useSWR<{ iframeable: boolean }>(
    `/api/links/iframeable?url=${debouncedUrl}&domain=${domain}`,
    fetcher,
  );

  return (
    <div className="flex items-start space-x-2 rounded-md border border-gray-300 bg-white p-3">
      <div className="flex-none">
        {isLoading ? (
          <LoadingSpinner className="h-5 w-5" />
        ) : data?.iframeable ? (
          <CheckCircleFill className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircleFill className="h-5 w-5 text-yellow-500" />
        )}
      </div>
      <div className="flex flex-col space-y-0.5">
        <p className="text-sm font-semibold text-gray-700">
          {!data || isLoading
            ? "Checking if URL is iFrameable..."
            : data.iframeable
              ? "URL is iFrameable"
              : "URL is not iFrameable"}
        </p>
        {data &&
          (data.iframeable ? (
            <p className="text-sm text-gray-600">
              It will be cloaked successfully.{" "}
              <a
                href="https://dub.co/help/article/link-cloaking"
                target="_blank"
                className="text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                Learn more.
              </a>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              We will try to cloak it with{" "}
              <a
                href="https://nextjs.org/docs/pages/api-reference/functions/next-response#rewrite"
                target="_blank"
                className="text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                Next.js Rewrites
              </a>
              , but it might not work as expected.{" "}
              <a
                href="https://dub.co/help/article/link-cloaking"
                target="_blank"
                className="text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                Learn more.
              </a>
            </p>
          ))}
      </div>
    </div>
  );
}
