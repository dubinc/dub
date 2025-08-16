"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Button, TooltipContent } from "@dub/ui";
import { subMonths } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AuditLogs() {
  const [loading, setLoading] = useState(false);
  const { plan, slug, id: workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const start =
    searchParams.get("start") || subMonths(new Date(), 12).toISOString();
  const end = searchParams.get("end") || new Date().toISOString();

  const { canExportAuditLogs } = getPlanCapabilities(plan);

  const exportAuditLogs = async () => {
    if (!workspaceId) {
      return;
    }

    setLoading(true);

    const lid = toast.loading("Exporting audit logs...");

    try {
      const response = await fetch(
        `/api/audit-logs/export?workspaceId=${workspaceId}`,
        {
          method: "POST",
          body: JSON.stringify({
            start,
            end,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `Dub Audit Logs Export - ${new Date().toISOString()}.csv`;
      a.click();

      toast.success("Exported successfully");
    } catch (error) {
      toast.error(error);
    } finally {
      setLoading(false);
      toast.dismiss(lid);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-6 p-5 sm:p-10">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-semibold">Audit Logs</h2>
          <p className="text-sm text-neutral-500">
            Workspace partner and payout history
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:bg-white">
          <SimpleDateRangePicker
            className="w-full sm:max-w-xs"
            align="start"
            disabled={!canExportAuditLogs}
            defaultInterval="1y"
          />

          <Button
            text="Export CSV"
            variant="secondary"
            className="w-full sm:w-auto"
            disabledTooltip={
              !canExportAuditLogs && (
                <TooltipContent
                  title="Audit log export is only available on the Enterprise Plan."
                  cta="Contact sales"
                  href="https://dub.co/enterprise"
                  target="_blank"
                />
              )
            }
            disabled={!canExportAuditLogs}
            onClick={exportAuditLogs}
            loading={loading}
          />
        </div>
      </div>

      {!canExportAuditLogs && (
        <div className="flex items-center justify-between rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-3 py-3 sm:px-10">
          <span className="text-sm text-neutral-500">
            Audit logs are available on the{" "}
            <a
              href="https://dub.co/enterprise"
              target="_blank"
              className="text-neutral-700 underline"
            >
              Enterprise Plan
            </a>
          </span>
          <Button
            text="Upgrade"
            className="h-8 w-auto px-5"
            onClick={() =>
              window.open(
                slug ? `/${slug}/upgrade` : "https://dub.co/enterprise",
                "_blank",
              )
            }
          />
        </div>
      )}
    </div>
  );
}
