import { Button } from "@dub/ui/src/button";
import { Download } from "@dub/ui/src/icons";
import { capitalize } from "@dub/utils";
import { Dispatch, SetStateAction, useContext, useState } from "react";
import { toast } from "sonner";
import { AnalyticsContext } from "./analytics-provider";
import { EventsTableContext } from "./events";

export default function ExportButton({
  page,
  setOpenPopover,
}: {
  page: "analytics" | "events";
  setOpenPopover: Dispatch<SetStateAction<boolean>>;
}) {
  const [loading, setLoading] = useState(false);
  const { queryString } = useContext(AnalyticsContext);
  const { exportQueryString } = useContext(EventsTableContext);

  console.log(exportQueryString);

  async function exportData() {
    setLoading(true);
    try {
      const response = await fetch(
        page === "analytics"
          ? `/api/analytics/export?${queryString}`
          : `/api/analytics/events/export?${exportQueryString}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        setLoading(false);
        throw new Error(response.statusText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dub ${capitalize(page)} Export - ${new Date().toISOString()}.${page === "analytics" ? "zip" : "csv"}`;
      a.click();
    } catch (error) {
      throw new Error(error);
    }
    setLoading(false);
  }

  return (
    <Button
      text="Download as CSV"
      variant="outline"
      icon={<Download className="h-4 w-4" />}
      className="h-9 justify-start px-2 text-black"
      onClick={() => {
        setOpenPopover(false);
        toast.promise(exportData(), {
          loading: "Exporting files...",
          success: "Exported successfully",
          error: (error) => error,
        });
      }}
      loading={loading}
    />
  );
}
