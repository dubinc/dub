"use client";

import { partnerProfileFetch } from "@/lib/api/partner-profile/client";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PartnerUserProps, ProgramProps } from "@/lib/types";
import { ProgramAccessScope } from "@dub/prisma/client";
import { BlurImage, Button, Sheet } from "@dub/ui";
import { CircleCheckFill } from "@dub/ui/icons";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { PartnerLinksSelector } from "./partner-links-selector";

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
  const [accessState, setAccessState] = useState<Record<string, boolean>>({});

  const [programAccess, setProgramAccess] = useState<ProgramAccessScope>(
    user.programAccess,
  );

  const [linkState, setLinkState] = useState<
    Record<string, string[] | undefined>
  >({});

  const isTargetOwner = user.role === "owner";
  const canEdit = isCurrentUserOwner && !isTargetOwner;

  useEffect(() => {
    if (!programEnrollments) return;

    const programMap = new Map(user.programs.map((p) => [p.id, p]));
    const allAccess = isTargetOwner || user.programAccess === "all";

    const initialAccess: Record<string, boolean> = {};
    const initialLinks: Record<string, string[] | undefined> = {};

    for (const enrollment of programEnrollments) {
      const program = programMap.get(enrollment.programId);
      initialAccess[enrollment.programId] =
        allAccess || programMap.has(enrollment.programId);

      // If program has explicit link assignments, use them; otherwise undefined = all links
      if (program && program.links.length > 0) {
        initialLinks[enrollment.programId] = program.links.map((l) => l.id);
      } else {
        initialLinks[enrollment.programId] = undefined;
      }
    }

    setAccessState(initialAccess);
    setLinkState(initialLinks);
    setProgramAccess(isTargetOwner ? "all" : user.programAccess);
  }, [programEnrollments, user.programs, user.programAccess, isTargetOwner]);

  const hasChanges = (() => {
    if (programAccess !== user.programAccess) return true;
    if (programAccess === "all") return false;
    if (!programEnrollments) return false;

    const programMap = new Map(user.programs.map((p) => [p.id, p]));

    return programEnrollments.some((enrollment) => {
      const current = accessState[enrollment.programId] ?? false;
      const original = programMap.has(enrollment.programId);
      if (current !== original) return true;

      // Check link changes for programs that have access
      if (current) {
        const program = programMap.get(enrollment.programId);
        const originalLinkIds = program?.links.map((l) => l.id) ?? [];
        const currentLinkIds = linkState[enrollment.programId];

        // Both undefined = no change (all links)
        if (currentLinkIds === undefined && originalLinkIds.length === 0) {
          return false;
        }

        // One undefined, other not
        if (currentLinkIds === undefined || originalLinkIds.length === 0) {
          return currentLinkIds !== undefined || originalLinkIds.length !== 0;
        }

        // Compare arrays
        const sortedOriginal = [...originalLinkIds].sort();
        const sortedCurrent = [...currentLinkIds].sort();

        if (sortedOriginal.length !== sortedCurrent.length) {
          return true;
        }

        return sortedOriginal.some((id, i) => id !== sortedCurrent[i]);
      }

      return false;
    });
  })();

  const handleSave = async () => {
    if (!user.id) return;

    const programIds =
      programAccess === "all"
        ? []
        : Object.entries(accessState)
            .filter(([, hasAccess]) => hasAccess)
            .map(([id]) => id);

    // Build linkIds map for accessible programs
    const linkIds: Record<string, string[] | undefined> = {};
    if (programAccess === "restricted") {
      for (const programId of programIds) {
        linkIds[programId] = linkState[programId];
      }
    }

    setIsSaving(true);

    await partnerProfileFetch(
      "@put/api/partner-profile/users/:userId/programs",
      {
        params: {
          userId: user.id,
        },
        body: {
          programAccess,
          programIds,
          linkIds,
        },
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
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              {(
                [
                  {
                    id: "all",
                    label: "All",
                    description: "User has access to all programs",
                  },
                  {
                    id: "restricted",
                    label: "Restricted",
                    description: "Select program access individually",
                  },
                ] as const
              ).map(({ id, label, description }) => {
                const isSelected = programAccess === id;

                return (
                  <label
                    key={id}
                    className={cn(
                      "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                      "transition-all duration-150",
                      isSelected &&
                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                    )}
                  >
                    <input
                      type="radio"
                      value={id}
                      className="hidden"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setProgramAccess(id);
                        }
                      }}
                    />
                    <div className="flex grow flex-col text-neutral-900">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs font-normal">{description}</span>
                    </div>
                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        isSelected && "scale-100 opacity-100",
                      )}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex h-full flex-col gap-3 overflow-y-auto bg-neutral-100 px-4 py-6">
          {isLoading ? (
            [...Array(3)].map((_, i) => <ProgramRowPlaceholder key={i} />)
          ) : !programEnrollments || programEnrollments.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              No programs available.
            </div>
          ) : (
            programEnrollments.map((enrollment) => {
              const hasAccess =
                programAccess === "all" ||
                (accessState[enrollment.programId] ?? false);
              const showLinkPicker =
                canEdit && programAccess === "restricted" && hasAccess;

              return (
                <ProgramRow
                  key={enrollment.programId}
                  program={enrollment.program}
                  hasAccess={hasAccess}
                  canEdit={canEdit && programAccess === "restricted"}
                  showLinkPicker={showLinkPicker}
                  selectedLinkIds={linkState[enrollment.programId]}
                  onAccessChange={(newAccess) =>
                    setAccessState((prev) => ({
                      ...prev,
                      [enrollment.programId]: newAccess,
                    }))
                  }
                  onLinkChange={(ids) =>
                    setLinkState((prev) => ({
                      ...prev,
                      [enrollment.programId]: ids,
                    }))
                  }
                />
              );
            })
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
  showLinkPicker,
  selectedLinkIds,
  onAccessChange,
  onLinkChange,
}: {
  program: Pick<ProgramProps, "id" | "name" | "slug" | "logo">;
  hasAccess: boolean;
  canEdit: boolean;
  showLinkPicker: boolean;
  selectedLinkIds: string[] | undefined;
  onAccessChange: (hasAccess: boolean) => void;
  onLinkChange: (ids: string[] | undefined) => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-200",
        showLinkPicker ? "bg-neutral-50" : "bg-white",
      )}
    >
      <div
        className={cn(
          "p-3",
          showLinkPicker && "border-b border-neutral-200 bg-white",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 shrink-0 overflow-hidden rounded-full border border-black/[0.08]">
            <BlurImage
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt={program.name}
              className="size-full object-cover"
              width={32}
              height={32}
            />
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.28px] text-neutral-800">
            {program.name}
          </span>

          {canEdit ? (
            <div className="relative shrink-0">
              <select
                className={cn(
                  "w-fit cursor-pointer appearance-none rounded-lg border border-neutral-200 py-1.5 pl-3",
                  "text-sm font-medium leading-5",
                  "outline-none focus:border-neutral-300 focus:ring-1 focus:ring-neutral-300",
                )}
                value={hasAccess ? "access" : "no_access"}
                onChange={(e) => onAccessChange(e.target.value === "access")}
              >
                <option value="access">Access</option>
                <option value="no_access">No access</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
            </div>
          ) : (
            <Link href={`/programs/${program.slug}`} className="shrink-0">
              <Button
                variant="secondary"
                text="View"
                className="h-8 w-fit rounded-lg"
              />
            </Link>
          )}
        </div>
      </div>

      {showLinkPicker && (
        <div className="flex flex-col gap-2 p-4">
          <div className="flex h-[18px] items-center">
            <span className="text-sm font-medium tracking-[-0.28px] text-neutral-900">
              Links
            </span>
          </div>
          <PartnerLinksSelector
            programId={program.id}
            selectedLinkIds={selectedLinkIds}
            setSelectedLinkIds={onLinkChange}
          />
        </div>
      )}
    </div>
  );
}

function ProgramRowPlaceholder() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="size-8 shrink-0 animate-pulse rounded-full border border-black/[0.08] bg-neutral-200" />
          <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-neutral-200" />
          <div className="h-8 w-[88px] shrink-0 animate-pulse rounded-lg bg-neutral-200" />
        </div>
      </div>
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
