"use client";

import { SubmittedLeadProps } from "@/lib/types";
import { SubmittedLeadStatus } from "@dub/prisma/client";
import { Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SubmittedLeadStatusBadges } from "./submitted-lead-status-badges";

interface SubmittedLeadStatusDropdownProps {
  lead: SubmittedLeadProps;
  selectedStatus?: SubmittedLeadStatus;
  onStatusChange: (newStatus: SubmittedLeadStatus) => void;
}

export function SubmittedLeadStatusDropdown({
  lead,
  selectedStatus,
  onStatusChange,
}: SubmittedLeadStatusDropdownProps) {
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);

  const displayStatus = selectedStatus ?? lead.status;
  const currentBadge = SubmittedLeadStatusBadges[displayStatus];
  const allStatuses = Object.keys(
    SubmittedLeadStatusBadges,
  ) as SubmittedLeadStatus[];

  const handleStatusChange = (newStatus: SubmittedLeadStatus) => {
    if (newStatus !== lead.status) {
      onStatusChange(newStatus);
    }
    setOpenStatusDropdown(false);
  };

  return (
    <Popover
      openPopover={openStatusDropdown}
      setOpenPopover={setOpenStatusDropdown}
      popoverContentClassName="w-[var(--radix-popover-trigger-width)]"
      content={
        <div className="w-full p-2">
          {allStatuses.map((status) => {
            const badge = SubmittedLeadStatusBadges[status];
            const isSelected = status === displayStatus;
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-md px-2 py-2 transition-colors",
                  "hover:bg-gray-100",
                  isSelected && "bg-gray-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "rounded-md px-1 text-xs font-semibold leading-4 tracking-[-0.24px]",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </div>
                </div>
                {isSelected && <Check className="size-4 text-gray-900" />}
              </button>
            );
          })}
        </div>
      }
      align="start"
    >
      <button
        onClick={() => setOpenStatusDropdown(!openStatusDropdown)}
        className={cn(
          "flex w-full items-center justify-between gap-4 rounded-md border border-gray-200 bg-white p-2 transition-colors",
          "hover:bg-gray-50",
          openStatusDropdown && "bg-gray-50",
        )}
      >
        <div
          className={cn(
            "rounded-md px-1 text-xs font-semibold leading-4 tracking-[-0.24px]",
            currentBadge.className,
          )}
        >
          {currentBadge.label}
        </div>
        <ChevronDown
          className={cn(
            "size-3 text-gray-600 transition-transform",
            openStatusDropdown && "rotate-180",
          )}
        />
      </button>
    </Popover>
  );
}
