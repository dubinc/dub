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
    <div className="mb-6 rounded-xl border border-neutral-200 bg-white">
      <div className="relative flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium text-neutral-900">Audit Logs</h2>
          <p className="text-sm text-neutral-500">
            Workspace partner and payout history
          </p>
        </div>
        <div className="flex flex-col items-start justify-between space-y-4 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
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
        <div className="flex flex-col items-start justify-between space-y-3 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
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
