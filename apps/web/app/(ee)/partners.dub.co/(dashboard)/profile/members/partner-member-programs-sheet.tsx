"use client";

import { partnerProfileFetch } from "@/lib/api/partner-profile/client";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PartnerUserProps, ProgramProps } from "@/lib/types";
import { ProgramAccessScope } from "@dub/prisma/client";
import { BlurImage, Button, Sheet } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { X } from "lucide-react";
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
            <select
              className="mt-1.5 w-full cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-300 focus:ring-neutral-300"
              value={programAccess}
              onChange={(e) =>
                setProgramAccess(e.target.value as ProgramAccessScope)
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
            programEnrollments.map((enrollment) => {
              const hasAccess =
                programAccess === "all" ||
                (accessState[enrollment.programId] ?? false);
              const showLinkPicker =
                canEdit && programAccess === "restricted" && hasAccess;

              return (
                <ProgramRow
                  key={enrollment.programId}
                  programId={enrollment.programId}
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
  programId,
  program,
  hasAccess,
  canEdit,
  showLinkPicker,
  selectedLinkIds,
  onAccessChange,
  onLinkChange,
}: {
  programId: string;
  program: Pick<ProgramProps, "name" | "slug" | "logo">;
  hasAccess: boolean;
  canEdit: boolean;
  showLinkPicker: boolean;
  selectedLinkIds: string[] | undefined;
  onAccessChange: (hasAccess: boolean) => void;
  onLinkChange: (ids: string[] | undefined) => void;
}) {
  return (
    <div className="rounded-lg p-3 transition-colors duration-150 hover:bg-neutral-50">
      <div className="flex items-center justify-between">
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
            onChange={(e) => onAccessChange(e.target.value === "access")}
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

      {showLinkPicker && (
        <div className="mt-2 pl-11">
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Links
          </label>
          <PartnerLinksSelector
            programId={programId}
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
