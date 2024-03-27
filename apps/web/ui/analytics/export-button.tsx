import { LoadingSpinner, Tooltip, TooltipContent } from "@dub/ui";
import zip from "jszip";
import { Download } from "lucide-react";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { AnalyticsContext } from ".";
import { HOME_DOMAIN } from "@dub/utils";

export default function ExportButton() {
  const [loading, setLoading] = useState(false);
  const { totalClicks } = useContext(AnalyticsContext);
  const { baseApiPath, queryString } = useContext(AnalyticsContext);

  async function exportData() {
    setLoading(true);
    try {
      const response = await fetch(`${baseApiPath}/export?${queryString}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dub Analytics Export - ${new Date().toISOString()}.zip`;
      a.click();
    } catch (error) {
      throw new Error(error);
    }
    setLoading(false);
  }

  // show a tooltip to make the user aware that there is no data to export if there is no data
  return totalClicks === 0 || !totalClicks ? (
    <Tooltip
      content={
        <TooltipContent
          title="There's no data available for download. Try adjusting your filter or date range settings."
          cta="Learn more"
          href={`${HOME_DOMAIN}/help/article/how-to-export-analytics`}
        />
      }
    >
      <button
        disabled={true}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white transition-all disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white disabled:active:bg-white"
      >
        <Download className="h-4 w-4" />
      </button>
    </Tooltip>
  ) : (
    <button
      disabled={loading}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white transition-all focus:border-gray-500 focus:ring-4 focus:ring-gray-200 disabled:cursor-progress disabled:text-gray-400 disabled:hover:bg-white disabled:active:bg-white"
      onClick={() => {
        toast.promise(exportData(), {
          loading: "Exporting files...",
          success: "Exported successfully",
          error: (error) => error,
        });
      }}
    >
      {loading ? (
        <LoadingSpinner className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}
