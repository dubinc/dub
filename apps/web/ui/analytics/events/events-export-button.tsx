import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Download, TooltipContent } from "@dub/ui";
import { useSession } from "next-auth/react";
import { Dispatch, SetStateAction, useContext } from "react";
import { toast } from "sonner";
import { AnalyticsContext } from "../analytics-provider";
import { EventsContext } from "./events-provider";

export function EventsExportButton({
  setOpenPopover,
}: {
  setOpenPopover: Dispatch<SetStateAction<boolean>>;
}) {
  const { exportQueryString } = useContext(EventsContext);
  const { eventsApiPath } = useContext(AnalyticsContext);
  const { slug, plan } = useWorkspace();
  const { data: session } = useSession();

  const needsHigherPlan = plan === "free" || plan === "pro";

  async function exportData() {
    const response = await fetch(
      `${eventsApiPath}/export?${exportQueryString}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    if (response.status === 202) {
      setOpenPopover(false);
      return {
        isAsync: true,
        message: `Your export is being processed and we'll send you an email (${session?.user?.email}) when it's ready to download.`,
      };
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dub Events Export - ${new Date().toISOString()}.csv`;
    a.click();
    setOpenPopover(false);
    return {
      isAsync: false,
      message: "Exported successfully",
    };
  }

  return (
    <Button
      variant="outline"
      icon={<Download className="h-4 w-4 shrink-0" />}
      className="h-9 justify-start px-2 text-black"
      text="Download as CSV"
      disabledTooltip={
        needsHigherPlan && (
          <TooltipContent
            title="Upgrade to our Business Plan to enable CSV downloads for events in your workspace."
            cta="Upgrade to Business"
            href={`/${slug}/upgrade`}
          />
        )
      }
      onClick={() => {
        toast.promise(exportData(), {
          loading: "Exporting file...",
          success: (data) => data.message,
          error: (error) => error,
        });
      }}
    />
  );
}
