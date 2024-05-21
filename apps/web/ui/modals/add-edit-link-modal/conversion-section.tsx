import { LinkProps } from "@/lib/types";
import { AlertCircleFill, CheckCircleFill } from "@/ui/shared/icons";
import { LoadingSpinner, SimpleTooltipContent, Switch } from "@dub/ui";
import { BadgeTooltip } from "@dub/ui/src/tooltip";
import { fetcher } from "@dub/utils";
import { FlaskConical } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import useSWR from "swr";

export default function ConversionSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { trackConversion } = data;
  const [enabled, setEnabled] = useState(trackConversion);
  useEffect(() => {
    if (enabled) {
      // if enabling, set trackConversion to true
      setData({
        ...data,
        trackConversion: true,
      });
    } else {
      // if disabling, set trackConversion to false
      setData({ ...data, trackConversion: false });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">
            Conversion Tracking
          </h2>
          <BadgeTooltip
            content={
              <SimpleTooltipContent
                title="Track conversions on your short link to measure the effectiveness of your marketing campaigns."
                cta="Learn more."
                href="https://dub.co/help/article/conversion-tracking"
              />
            }
          >
            <div className="flex items-center space-x-1">
              <FlaskConical size={12} />
              <p className="uppercase">Beta</p>
            </div>
          </BadgeTooltip>
        </div>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>

      {/* {enabled && (
        <motion.div className="mt-3" {...FADE_IN_ANIMATION_SETTINGS}>
          <CheckConversionScript url={getUrlFromString(data.url)} />
        </motion.div>
      )} */}
    </div>
  );
}

function CheckConversionScript({ url }: { url: string }) {
  const { data, isLoading } = useSWR<{ installed: boolean }>(
    url && `/api/links/check-conversion-script?url=${url}`,
    fetcher,
  );

  return (
    <div className="flex items-start space-x-2 rounded-md border border-gray-300 bg-white p-3">
      <div className="flex-none">
        {!data || isLoading ? (
          <LoadingSpinner className="h-5 w-5" />
        ) : data.installed ? (
          <CheckCircleFill className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircleFill className="h-5 w-5 text-yellow-500" />
        )}
      </div>
      <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium text-gray-700">
          {!data || isLoading
            ? "Checking if conversion script is installed..."
            : data.installed
              ? "Conversion Script is installed"
              : "Conversion Script not detected"}
        </p>
        {data &&
          (data.installed ? (
            <p className="text-xs text-gray-600">
              We will track conversions on this link.{" "}
              <a
                href="https://dub.co/help/article/conversion-tracking"
                target="_blank"
                className="text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                Learn more.
              </a>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              We recommend adding the{" "}
              <a
                href="https://github.com/dubinc/analytics"
                target="_blank"
                className="font-mono text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                @dub/analytics
              </a>{" "}
              script for reliable conversion tracking.{" "}
              <a
                href="https://dub.co/help/article/conversion-tracking"
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
