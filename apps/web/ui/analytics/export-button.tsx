import { IconMenu, LoadingSpinner, Tooltip, TooltipContent } from "@dub/ui";
import zip from "jszip";
import { Download } from "lucide-react";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { AnalyticsContext } from ".";

export default function ExportButton() {
  const [loading, setLoading] = useState(false);
  const { totalClicks } = useContext(AnalyticsContext);
  const { baseApiPath, queryString } = useContext(AnalyticsContext);
  const exportableEndpoints = [
    "timeseries",
    "country",
    "top_urls",
    "device",
    "referer",
  ];

  const exportData = async () => {
    const zipFile = new zip();
    for (const endpoint of exportableEndpoints) {
      try {
        const data = await fetch(
          `${baseApiPath}/${endpoint}/export?${queryString}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        ).then((res) => res.blob());
        zipFile.file(`${endpoint}.csv`, data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to export");
      }
    }

    zipFile.generateAsync({ type: "blob" }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "analytics-export.zip";
      a.click();
    });
  };

  // show a tooltip to make the user aware that there is no data to export if there is no data
  return totalClicks === 0 || !totalClicks ? (
    <Tooltip content={<TooltipContent title="No data available" />}>
      <button
        disabled={loading || totalClicks === 0 || !totalClicks}
        className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-300"
        onClick={async () => {
          setLoading(true);
          await exportData();
          setLoading(false);
          toast.success("Exported successfully");
        }}
      >
        <IconMenu text="Export" icon={<Download className="h-4 w-4" />} />
      </button>
    </Tooltip>
  ) : (
    <button
      disabled={loading}
      className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 transition-all hover:bg-gray-100 active:scale-95 disabled:cursor-progress disabled:text-gray-400 disabled:hover:shadow disabled:active:scale-100"
      onClick={async () => {
        setLoading(true);
        await exportData();
        setLoading(false);
        toast.success("Exported successfully");
      }}
    >
      {loading ? (
        <IconMenu text="Export" icon={<LoadingSpinner className="h-4 w-4" />} />
      ) : (
        <IconMenu text="Export" icon={<Download className="h-4 w-4" />} />
      )}
    </button>
  );
}
