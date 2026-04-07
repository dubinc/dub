"use client";

import type { ReactNode } from "react";

import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PartnerUserProps } from "@/lib/types";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { Plus } from "lucide-react";

const MAX_VISIBLE_LOGOS = 3;
const MAX_OVERFLOW_LABEL = 9;

function ProgramsHover({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className="group w-fit rounded-lg p-2 transition-colors duration-150 hover:cursor-pointer hover:bg-neutral-100"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function PartnerMemberProgramsCell({
  programs,
  programAccess,
  onClick,
}: {
  programs: PartnerUserProps["programs"];
  programAccess: PartnerUserProps["programAccess"];
  onClick?: () => void;
}) {
  const { programEnrollments, isLoading: enrollmentsLoading } =
    useProgramEnrollments();

  const fromEnrollments = (programEnrollments ?? []).map((e) => ({
    id: e.programId,
    name: e.program.name,
    logo: e.program.logo,
  }));

  const displayPrograms = programAccess === "all" ? fromEnrollments : programs;

  if (enrollmentsLoading && programAccess === "all") {
    return (
      <div className="inline-flex rounded-full bg-neutral-100 px-1 py-1">
        <div
          className="size-6 shrink-0 animate-pulse rounded-full bg-neutral-200"
          aria-hidden
        />
      </div>
    );
  }

  if (programAccess === "all") {
    const totalCount = displayPrograms.length;

    if (totalCount <= 1) {
      const program = displayPrograms[0];

      return (
        <ProgramsHover onClick={onClick}>
          {program ? (
            <img
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt=""
              className="size-6 shrink-0 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-neutral-200">
              <Plus className="size-3.5 text-neutral-500" strokeWidth={2.5} />
            </div>
          )}
        </ProgramsHover>
      );
    }

    const allLabel =
      totalCount > MAX_OVERFLOW_LABEL
        ? `All ${MAX_OVERFLOW_LABEL}+`
        : `All ${totalCount}`;

    return (
      <ProgramsHover onClick={onClick}>
        <div className="flex h-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 px-2 text-xs font-medium text-neutral-600">
          {allLabel}
        </div>
      </ProgramsHover>
    );
  }

  if (displayPrograms.length === 0) {
    return (
      <ProgramsHover onClick={onClick}>
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-neutral-200">
          <Plus className="size-3.5 text-neutral-500" strokeWidth={2.5} />
        </div>
      </ProgramsHover>
    );
  }

  const visible = displayPrograms.slice(0, MAX_VISIBLE_LOGOS);
  const hiddenCount = Math.max(0, displayPrograms.length - MAX_VISIBLE_LOGOS);
  const extra = hiddenCount > 0 ? Math.min(hiddenCount, MAX_OVERFLOW_LABEL) : 0;

  return (
    <ProgramsHover onClick={onClick}>
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
        {extra > 0 ? (
          <div className="-ml-1.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-xs font-medium text-neutral-600">
            +{extra}
          </div>
        ) : null}
      </div>
    </ProgramsHover>
  );
}
