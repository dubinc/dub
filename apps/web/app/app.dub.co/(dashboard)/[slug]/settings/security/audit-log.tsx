"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, DateRangePicker, TooltipContent } from "@dub/ui";
import { subMonths } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const defaultDateRange = {
  from: subMonths(new Date(), 12),
  to: new Date(),
} as const;

export const AuditLog = () => {
  const { plan, id: workspaceId } = useWorkspace();
  const [dateRange, setDateRange] = useState(defaultDateRange);

  const exportCSV = async () => {
    if (!workspaceId) {
      return;
    }

    const lid = toast.loading("Exporting audit logs...");

    try {
      const response = await fetch(
        `/api/audit-logs/export?workspaceId=${workspaceId}`,
        {
          method: "POST",
          body: JSON.stringify({
            start: dateRange.from.toISOString(),
            end: dateRange.to.toISOString(),
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
      toast.dismiss(lid);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Audit logs</h2>
            <p className="text-sm text-neutral-500">
              Track and analyze your team members' activities.
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3">
            <DateRangePicker
              className="w-full sm:min-w-[200px] md:w-fit"
              value={dateRange}
              onChange={(range) => {
                if (range && range.from && range.to) {
                  setDateRange({ from: range.from, to: range.to });
                } else {
                  setDateRange(defaultDateRange);
                }
              }}
            />

            <Button
              text="Export CSV"
              className="w-fit"
              disabled={plan !== "enterprise"}
              {...(plan !== "enterprise" && {
                disabledTooltip: (
                  <TooltipContent
                    title="Audit logs are available on the Enterprise plan."
                    cta="Contact sales"
                    href="https://dub.co/enterprise"
                    target="_blank"
                  />
                ),
              })}
              onClick={exportCSV}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-3 py-5 sm:px-10">
          <a
            href="https://dub.co/enterprise"
            target="_blank"
            className="text-sm text-neutral-400 underline underline-offset-4 transition-colors hover:text-neutral-700"
          >
            Audit logs are available on the Enterprise plan.
          </a>
        </div>
      </div>
    </>
  );
};
