import { Button, Download } from "@dub/ui";
import { useContext } from "react";
import { toast } from "sonner";
import { EventsContext } from "./events-provider";

export default function ExportButton({ onClick }: { onClick?: () => void }) {
  const { exportQueryString } = useContext(EventsContext);

  async function exportData() {
    const response = await fetch(`/api/events/export?${exportQueryString}`, {
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
    a.download = `Dub Events Export - ${new Date().toISOString()}.csv`;
    a.click();
  }

  return (
    <Button
      variant="outline"
      icon={<Download className="h-4 w-4 shrink-0" />}
      className="h-9 justify-start px-2 text-black"
      text="Download as CSV"
      onClick={() => {
        toast.promise(exportData(), {
          loading: "Exporting file...",
          success: "Exported successfully",
          error: (error) => error,
        });
        onClick?.();
      }}
    />
  );
}
