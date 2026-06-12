import { Button } from "@dub/ui";
import { Download } from "@dub/ui/icons";
import { Dispatch, SetStateAction, useContext, useState } from "react";
import { toast } from "sonner";
import { AnalyticsContext } from "./analytics-provider";

export function AnalyticsExportButton({
  setOpenPopover,
}: {
  setOpenPopover: Dispatch<SetStateAction<boolean>>;
}) {
  const [loading, setLoading] = useState(false);
  const { queryString, baseApiPath, partnerPage } =
    useContext(AnalyticsContext);

  async function exportData() {
    setLoading(true);
    try {
      const exportPath = partnerPage
        ? `${baseApiPath}/export`
        : "/api/analytics/export";

      const response = await fetch(`${exportPath}?${queryString}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let message = response.statusText;

        try {
          const body = await response.json();
          if (body?.error?.message) {
            message = body.error.message;
          }
        } catch {
          // ignore JSON parse errors
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dub Analytics Export - ${new Date().toISOString()}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      setLoading(false);
    }
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
          loading: "Exporting analytics... This may take up to a minute.",
          success: "Exported successfully",
          error: (error) =>
            error instanceof Error ? error.message : "Export failed",
        });
      }}
      loading={loading}
    />
  );
}
