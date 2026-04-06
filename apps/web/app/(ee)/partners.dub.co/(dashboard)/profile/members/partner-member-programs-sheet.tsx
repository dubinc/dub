"use client";

import { partnerProfileFetch } from "@/lib/api/partner-profile/client";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PartnerUserProps, ProgramProps } from "@/lib/types";
import { BlurImage, Button, Sheet } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface PartnerMemberProgramsSheetProps {
  user: PartnerUserProps;
  isCurrentUserOwner: boolean;
  showSheet: boolean;
  setShowSheet: (show: boolean) => void;
}

function PartnerMemberProgramsSheetContent({
  user,
  isCurrentUserOwner,
  setShowSheet,
}: PartnerMemberProgramsSheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { programEnrollments, isLoading } = useProgramEnrollments();

  const isTargetOwner = user.role === "owner";
  const canEdit = isCurrentUserOwner && !isTargetOwner;

  const [scopeMode, setScopeMode] = useState<"all" | "restricted">(
    user.programAccess,
  );
  const [accessState, setAccessState] = useState<Record<string, boolean>>({});

  // Initialize access state from user's assigned programs when enrollments load
  useEffect(() => {
    if (!programEnrollments) return;

    const ids = new Set(user.programs.map((p) => p.id));
    const allAccess = isTargetOwner || user.programAccess === "all";

    const initial: Record<string, boolean> = {};
    for (const enrollment of programEnrollments) {
      initial[enrollment.programId] =
        allAccess || ids.has(enrollment.programId);
    }
    setAccessState(initial);
    setScopeMode(isTargetOwner ? "all" : user.programAccess);
  }, [programEnrollments, user.programs, user.programAccess, isTargetOwner]);

  const hasChanges = (() => {
    if (scopeMode !== user.programAccess) return true;
    if (scopeMode === "all") return false;

    // Check if individual program selections changed
    if (!programEnrollments) return false;
    const assignedProgramIds = new Set(user.programs.map((p) => p.id));
    return programEnrollments.some((enrollment) => {
      const current = accessState[enrollment.programId] ?? false;
      const original = assignedProgramIds.has(enrollment.programId);
      return current !== original;
    });
  })();

  const handleSave = async () => {
    if (!user.id) return;

    const programIds =
      scopeMode === "all"
        ? []
        : Object.entries(accessState)
            .filter(([, hasAccess]) => hasAccess)
            .map(([id]) => id);

    setIsSaving(true);

    await partnerProfileFetch(
      "@put/api/partner-profile/users/:userId/programs",
      {
        params: { userId: user.id },
        body: { programAccess: scopeMode, programIds },
        onSuccess: async () => {
          toast.success("Program assignments updated!");
          await mutate(
            (key) =>
              typeof key === "string" &&
              key.startsWith("/api/partner-profile/users"),
          );
          setShowSheet(false);
        },
        onError: (ctx) => {
          toast.error(
            ctx.error.message ?? "Failed to update program assignments.",
          );
        },
      },
    );

    setIsSaving(false);
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">Programs</Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {canEdit && (
          <div className="border-b border-neutral-200 px-6 py-4">
            <label className="text-sm font-medium text-neutral-700">
              Program access
            </label>
            <select
              className="mt-1.5 w-full cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-300 focus:ring-neutral-300"
              value={scopeMode}
              onChange={(e) =>
                setScopeMode(e.target.value as "all" | "restricted")
              }
            >
              <option value="all">All programs</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
        )}

        <div className="flex flex-col px-4 py-6">
          {isLoading ? (
            [...Array(3)].map((_, i) => <ProgramRowPlaceholder key={i} />)
          ) : !programEnrollments || programEnrollments.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              No programs available.
            </div>
          ) : (
            programEnrollments.map((enrollment) => (
              <ProgramRow
                key={enrollment.programId}
                program={enrollment.program}
                hasAccess={
                  scopeMode === "all" ||
                  (accessState[enrollment.programId] ?? false)
                }
                canEdit={canEdit && scopeMode === "restricted"}
                onChange={(hasAccess) =>
                  setAccessState((prev) => ({
                    ...prev,
                    [enrollment.programId]: hasAccess,
                  }))
                }
              />
            ))
          )}
        </div>
      </div>

      {canEdit && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-neutral-200 bg-white px-6 py-4">
          <Sheet.Close asChild>
            <Button variant="secondary" text="Cancel" className="h-9 w-fit" />
          </Sheet.Close>
          <Button
            text="Save"
            className="h-9 w-fit"
            disabled={!hasChanges}
            loading={isSaving}
            onClick={handleSave}
          />
        </div>
      )}
    </>
  );
}

function ProgramRow({
  program,
  hasAccess,
  canEdit,
  onChange,
}: {
  program: Pick<ProgramProps, "name" | "slug" | "logo">;
  hasAccess: boolean;
  canEdit: boolean;
  onChange: (hasAccess: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg p-3 transition-colors duration-150 hover:cursor-pointer hover:bg-neutral-100">
      <div className="flex min-w-0 items-center gap-3">
        <BlurImage
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-8 shrink-0 overflow-hidden rounded-full"
          width={32}
          height={32}
        />
        <span className="truncate text-sm font-medium text-neutral-800">
          {program.name}
        </span>
      </div>

      {canEdit ? (
        <select
          className={cn(
            "cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-900 focus:border-neutral-300 focus:ring-neutral-300",
          )}
          value={hasAccess ? "access" : "no_access"}
          onChange={(e) => onChange(e.target.value === "access")}
        >
          <option value="access">Access</option>
          <option value="no_access">No access</option>
        </select>
      ) : (
        <Link href={`/programs/${program.slug}`}>
          <Button
            variant="secondary"
            text="View"
            className="h-8 w-fit text-xs"
          />
        </Link>
      )}
    </div>
  );
}

function ProgramRowPlaceholder() {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
      </div>
      <div className="h-8 w-20 animate-pulse rounded bg-neutral-200" />
    </div>
  );
}

export function PartnerMemberProgramsSheet(
  props: PartnerMemberProgramsSheetProps,
) {
  return (
    <Sheet open={props.showSheet} onOpenChange={props.setShowSheet}>
      <PartnerMemberProgramsSheetContent {...props} />
    </Sheet>
  );
}

export function usePartnerMemberProgramsSheet({
  user,
  isCurrentUserOwner,
}: {
  user: PartnerUserProps | null;
  isCurrentUserOwner: boolean;
}) {
  const [showSheet, setShowSheet] = useState(false);

  return {
    setShowSheet,
    PartnerMemberProgramsSheet: user ? (
      <PartnerMemberProgramsSheet
        user={user}
        isCurrentUserOwner={isCurrentUserOwner}
        showSheet={showSheet}
        setShowSheet={setShowSheet}
      />
    ) : null,
  };
}
