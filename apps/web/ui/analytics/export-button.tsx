import { IconMenu } from "@dub/ui";
import zip from "jszip";
import { Download } from "lucide-react";
import { useContext, useState } from "react";
import { AnalyticsContext } from ".";

export default function ExportButton() {
  const [loading, setLoading] = useState(false);
  const { baseApiPath, queryString } = useContext(AnalyticsContext);
  const exportableEndpoints = [
    "timeseries",
    "country",
    "top_urls",
    "device",
    "referer",
  ];

  return (
    <button
      className="flex items-center justify-center space-x-2 rounded-md bg-white p-4 px-3 py-2.5 text-sm shadow transition-all duration-75 hover:shadow-md active:scale-95"
      onClick={async () => {
        setLoading(true);
        const zipFile = new zip();
        for (const endpoint of exportableEndpoints) {
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
        }

        zipFile.generateAsync({ type: "blob" }).then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "analytics-export.zip";
          a.click();
        });
        setLoading(false);
      }}
    >
      {loading ? (
        <IconMenu
          text="Export"
          icon={
            <div className="relative h-4 w-4 animate-spin rounded-full border-[1.5px] border-black">
              <div className="absolute -right-0.5 -top-0.5 z-10 h-1/2 w-1/2 bg-white" />
            </div>
          }
        />
      ) : (
        <IconMenu text="Export" icon={<Download className="h-4 w-4" />} />
      )}
    </button>
  );
}
