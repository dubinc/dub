import { Button, Download } from "@dub/ui";
import { useState } from "react";
import { toast } from "sonner";

export default function ExportButton({
  queryString,
  disabled = false,
}: {
  queryString: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function exportData() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/events/export?${queryString}`,
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
      a.download = `Dub Events Export - ${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      throw new Error(error);
    }
    setLoading(false);
  }

  return (
    <Button
      className="h-8 whitespace-nowrap px-3"
      variant="secondary"
      icon={<Download className="h-4 w-4 shrink-0" />}
      text="Export"
      onClick={() => {
        toast.promise(exportData(), {
          loading: "Exporting file...",
          success: "Exported successfully",
          error: (error) => error,
        });
      }}
      disabled={disabled}
      loading={loading}
    />
  );
}
