"use client";

import { ReferralStatus } from "@dub/prisma/client";
import { Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ReferralStatusBadges } from "./referral-status-badges";

interface ReferralStatusDropdownProps {
  currentStatus: ReferralStatus;
  onStatusChange?: (newStatus: ReferralStatus) => void;
}

export function ReferralStatusDropdown({
  currentStatus,
  onStatusChange,
}: ReferralStatusDropdownProps) {
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);

  const currentBadge = ReferralStatusBadges[currentStatus];
  const allStatuses = Object.keys(ReferralStatusBadges) as ReferralStatus[];

  const handleStatusChange = (newStatus: ReferralStatus) => {
    if (newStatus !== currentStatus) {
      const newBadge = ReferralStatusBadges[newStatus];
      const confirmed = window.confirm(
        `Change referral status from "${currentBadge.label}" to "${newBadge.label}"?`,
      );
      if (confirmed) {
        if (onStatusChange) {
          onStatusChange(newStatus);
        } else {
          // TODO: Implement actual status update logic
          alert(`Status would be changed to: ${newBadge.label}`);
        }
      }
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
            const badge = ReferralStatusBadges[status];
            const isSelected = status === currentStatus;
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
