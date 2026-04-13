"use client";

import type { ReactNode } from "react";

import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PartnerUserProps } from "@/lib/types";
import { Tooltip } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";

const MAX_VISIBLE_LOGOS = 3;

function ProgramsHover({
  children,
  onClick,
  disabled,
  tooltip,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  "aria-label"?: string;
}) {
  const className = cn(
    "group w-fit rounded-lg border-0 bg-transparent p-2 font-inherit text-inherit transition-colors duration-150",
    disabled ? "cursor-default" : "hover:cursor-pointer hover:bg-neutral-100",
  );

  const content =
    onClick && !disabled ? (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    ) : (
      <div className={className}>{children}</div>
    );

  if (tooltip) {
    return <Tooltip content={tooltip}>{content}</Tooltip>;
  }

  return content;
}

export function PartnerMemberProgramsCell({
  partnerUser,
  onClick,
}: {
  partnerUser: PartnerUserProps;
  onClick?: () => void;
}) {
  const { programAccess, programs, role } = partnerUser;
  const isOwner = role === "owner";

  const { programEnrollments, isLoading: enrollmentsLoading } =
    useProgramEnrollments();

  const displayPrograms =
    programAccess === "all" ? programEnrollments ?? [] : programs;

  // Owner: always show "All" badge, disabled with tooltip
  if (isOwner) {
    return (
      <ProgramsHover
        disabled
        tooltip="Owners have access to all programs"
        aria-label="All programs"
      >
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600">
          All
        </div>
      </ProgramsHover>
    );
  }

  if (enrollmentsLoading && programAccess === "all") {
    return (
      <div className="inline-flex rounded-lg bg-neutral-100 px-3 py-2">
        <div
          className="size-6 shrink-0 animate-pulse rounded-full bg-neutral-200"
          aria-hidden
        />
      </div>
    );
  }

  // Member/Viewer with "all" access
  if (programAccess === "all") {
    return (
      <ProgramsHover onClick={onClick} aria-label="All programs">
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600">
          All
        </div>
      </ProgramsHover>
    );
  }

  const visible = displayPrograms.slice(0, MAX_VISIBLE_LOGOS);
  const hiddenCount = Math.max(0, displayPrograms.length - MAX_VISIBLE_LOGOS);

  return (
    <ProgramsHover
      onClick={onClick}
      aria-label={`View programs, ${displayPrograms.length} enrolled`}
    >
      <div className="flex items-center">
        {visible.map((p, index) => (
          <img
            key={p.id}
            src={p.logo || `${OG_AVATAR_URL}${p.name}`}
            alt=""
            className={cn(
              "size-6 shrink-0 rounded-full border-2 border-white object-cover",
              index > 0 && "-ml-1.5",
            )}
          />
        ))}
        {hiddenCount > 0 && (
          <div className="-ml-1.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-xs font-medium text-neutral-600">
            +{hiddenCount}
          </div>
        )}
      </div>
    </ProgramsHover>
  );
}
