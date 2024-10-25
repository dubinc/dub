import {
  Copy,
  IconMenu,
  Popover,
  Switch,
  Tick,
  useCopyToClipboard,
  useOptimisticUpdate,
} from "@dub/ui";
import { cn, linkConstructor } from "@dub/utils";
import { Share2 } from "lucide-react";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { AnalyticsContext } from "./analytics-provider";

export default function SharePopover() {
  const [openSharePopover, setopenSharePopoverPopover] = useState(false);

  const { queryString, domain, key } = useContext(AnalyticsContext) as {
    queryString: string;
    domain: string;
    key: string; // coerce to string since <SharePopover is not shown if key is undefined)
  };

  const { data, isLoading, update } = useOptimisticUpdate<{
    publicStats: boolean;
  }>(`/api/analytics/public-stats?${queryString}`, {
    loading: "Updating...",
    success: "Successfully updated stats page visibility!",
    error: "Something went wrong",
  });

  const [copied, copyToClipboard] = useCopyToClipboard();

  const statsUrl = `https://${domain}/stats/${encodeURIComponent(key)}`;
  
  const copyStatsUrl = ({ notify }: { notify: boolean }) => {
    notify &&
      toast.promise(copyToClipboard(statsUrl), {
        success: "Copied to clipboard",
      });
  };

  const handleUpdate = async (checked: boolean) => {
    const res = await fetch(`/api/analytics/public-stats?${queryString}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publicStats: checked,
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to update email preferences");
    }
    if (res.status === 200) {
      checked && copyStatsUrl({ notify: false });
    }
    return { publicStats: checked };
  };

  if (!data) return null;

  return (
    <Popover
      content={
        <div className="w-full divide-y divide-gray-200 text-sm md:w-60">
          <div className="p-4">
            <p className="text-gray-500">Share stats for</p>
            <p className="truncate font-semibold text-gray-800">
              {linkConstructor({ key, domain, pretty: true })}
            </p>
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-gray-800">Public Stats Page</p>
              <Switch
                checked={data?.publicStats}
                loading={isLoading}
                fn={(checked: boolean) => {
                  update(() => handleUpdate(checked), { publicStats: checked });
                }}
              />
            </div>
            <p className="text-gray-500">
              Making stats public will allow anyone with the link to see the
              stats for this short link.
            </p>
          </div>
          <div className="p-4">
            <p className="font-semibold text-gray-800">Share Link</p>
            <div className="divide-x-200 mt-2 flex items-center justify-between divide-x overflow-hidden rounded-md border border-gray-200 bg-gray-100">
              <div className="scrollbar-hide overflow-scroll pl-2">
                <p className="whitespace-nowrap text-gray-600">
                  {statsUrl}
                </p>
              </div>
              <button
                className="h-8 flex-none border-l bg-white px-2 hover:bg-gray-50 active:bg-gray-100"
                onClick={() => copyStatsUrl({ notify: true })}
              >
                {copied ? (
                  <Tick className="h-4 w-4 text-gray-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      }
      align="end"
      openPopover={openSharePopover}
      setOpenPopover={setopenSharePopoverPopover}
    >
      <button
        onClick={() => setopenSharePopoverPopover(!openSharePopover)}
        className={cn(
          "flex w-24 items-center justify-center space-x-2 rounded-md border bg-white px-3 py-2.5 outline-none transition-all sm:text-sm",
          "border-gray-200 bg-white text-gray-900 placeholder-gray-400 transition-all",
          "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
        )}
      >
        <IconMenu text="Share" icon={<Share2 className="h-4 w-4" />} />
      </button>
    </Popover>
  );
}
