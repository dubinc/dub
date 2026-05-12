"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Category } from "@dub/prisma/client";
import {
  Button,
  CrownSmall,
  GripDotsVertical,
  LoadingSpinner,
  Modal,
  PenWriting,
  useMediaQuery,
} from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { cn, fetcher, getDomainWithoutWWW, OG_AVATAR_URL } from "@dub/utils";
import {
  ProgramCategoriesList,
  UpdateProgramCategoriesModal,
} from "app/(ee)/admin.dub.co/(dashboard)/programs/program-categories-list";
import { Reorder, useDragControls } from "motion/react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

const MAX_MARKETPLACE_RANKING = 2147483647;

type MarketplaceProgram = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  url: string | null;
  description: string | null;
  addedToMarketplaceAt: string | Date;
  marketplaceRanking: number;
  categories: Category[];
};

export default function AdminProgramsPage() {
  const { data, isLoading, mutate } = useSWR<{
    programs: MarketplaceProgram[];
  }>("/api/admin/programs", fetcher, { keepPreviousData: true });

  const [programs, setPrograms] = useState<MarketplaceProgram[]>([]);
  const [rankedOrderIds, setRankedOrderIds] = useState<string[]>([]);
  const [initialRankedOrderIds, setInitialRankedOrderIds] = useState<string[]>(
    [],
  );
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [editingCategoriesProgramId, setEditingCategoriesProgramId] = useState<
    string | null
  >(null);
  const [editingDescriptionProgramId, setEditingDescriptionProgramId] =
    useState<string | null>(null);
  const [programToDelete, setProgramToDelete] =
    useState<MarketplaceProgram | null>(null);
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [newProgramSlug, setNewProgramSlug] = useState("");
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  useEffect(() => {
    if (!data?.programs) return;

    setPrograms(data.programs);
    const nextRankedOrder = data.programs.map((program) => program.id);

    setRankedOrderIds(nextRankedOrder);
    setInitialRankedOrderIds(nextRankedOrder);
  }, [data]);

  const programsById = useMemo(
    () =>
      Object.fromEntries(
        programs.map((program) => [program.id, program]),
      ) as Record<string, MarketplaceProgram>,
    [programs],
  );

  const rankedPrograms = useMemo(
    () =>
      rankedOrderIds
        .map((programId) => programsById[programId])
        .filter(Boolean),
    [rankedOrderIds, programsById],
  );

  const hasOrderChanges = useMemo(() => {
    if (rankedOrderIds.length !== initialRankedOrderIds.length) return true;
    return rankedOrderIds.some(
      (id, index) => id !== initialRankedOrderIds[index],
    );
  }, [rankedOrderIds, initialRankedOrderIds]);

  const rankingChanges = useMemo(() => {
    const originalRankedProgramIds = new Set(
      programs
        .filter(
          (program) => program.marketplaceRanking !== MAX_MARKETPLACE_RANKING,
        )
        .map((program) => program.id),
    );

    const rankedInCurrentOrder: string[] = [];
    let seenOriginalRankedProgram = false;

    for (let index = rankedOrderIds.length - 1; index >= 0; index--) {
      const programId = rankedOrderIds[index]!;
      const isOriginalRankedProgram = originalRankedProgramIds.has(programId);
      if (isOriginalRankedProgram) {
        seenOriginalRankedProgram = true;
      }
      if (seenOriginalRankedProgram) {
        rankedInCurrentOrder.push(programId);
      }
    }

    rankedInCurrentOrder.reverse();

    const rankingByProgramId = new Map(
      rankedInCurrentOrder.map((programId, index) => [programId, index + 1]),
    );

    const updates = rankedOrderIds
      .map((programId) => {
        const originalProgram = programsById[programId];
        if (!originalProgram) return null;

        const marketplaceRanking =
          rankingByProgramId.get(programId) ?? MAX_MARKETPLACE_RANKING;

        return originalProgram.marketplaceRanking !== marketplaceRanking
          ? { programId, marketplaceRanking }
          : null;
      })
      .filter(Boolean) as { programId: string; marketplaceRanking: number }[];

    return {
      updates,
    };
  }, [programs, rankedOrderIds, programsById]);

  const updateProgram = async (
    programId: string,
    payload: { description?: string | null; categories?: Category[] },
  ) => {
    const res = await fetch(`/api/admin/programs/${programId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      toast.error((await res.text()) || "Failed to update program.");
      return false;
    }

    const updatedProgram: {
      id: string;
      description: string | null;
      categories: Category[];
    } = await res.json();

    setPrograms((prev) =>
      prev.map((program) =>
        program.id === updatedProgram.id
          ? {
              ...program,
              description: updatedProgram.description,
              categories: updatedProgram.categories,
            }
          : program,
      ),
    );

    return true;
  };

  const saveOrderChanges = async () => {
    const { updates } = rankingChanges;

    if (updates.length === 0) {
      setInitialRankedOrderIds(rankedOrderIds);
      return;
    }

    setIsSavingOrder(true);

    const res = await fetch("/api/admin/programs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates }),
    });

    if (!res.ok) {
      setIsSavingOrder(false);
      toast.error((await res.text()) || "Failed to save program order.");
      return;
    }

    setPrograms((prev) =>
      prev.map((program) => {
        const updatedRanking = updates.find(
          (update) => update.programId === program.id,
        )?.marketplaceRanking;

        if (!updatedRanking) return program;
        return { ...program, marketplaceRanking: updatedRanking };
      }),
    );
    setInitialRankedOrderIds(rankedOrderIds);
    setIsSavingOrder(false);
    toast.success("Program rankings updated.");
  };

  const editingCategoriesProgram = editingCategoriesProgramId
    ? programsById[editingCategoriesProgramId]
    : null;
  const editingDescriptionProgram = editingDescriptionProgramId
    ? programsById[editingDescriptionProgramId]
    : null;
  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Remove marketplace program",
    description: programToDelete ? (
      <>
        Remove{" "}
        <span className="font-medium text-neutral-900">
          {programToDelete.name}
        </span>{" "}
        from marketplace listings?
      </>
    ) : null,
    confirmText: "Remove",
    confirmVariant: "danger",
    cancelText: "Cancel",
    onCancel: () => setProgramToDelete(null),
    onConfirm: async () => {
      if (!programToDelete) return;

      const res = await fetch(`/api/admin/programs/${programToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const message = await res.text();
        toast.error(message || "Failed to remove program.");
        throw new Error(message);
      }

      await mutate();
      toast.success("Program removed from marketplace.");
      setProgramToDelete(null);
    },
  });

  return (
    <>
      {confirmModal}
      <UpdateProgramCategoriesModal
        showModal={!!editingCategoriesProgram}
        setShowModal={(next) => {
          const show =
            typeof next === "function"
              ? next(Boolean(editingCategoriesProgram))
              : next;
          if (!show) setEditingCategoriesProgramId(null);
        }}
        selectedCategories={editingCategoriesProgram?.categories ?? []}
        programName={editingCategoriesProgram?.name ?? ""}
        isSaving={isSavingCategories}
        onSave={async (categories) => {
          if (!editingCategoriesProgram) return false;
          setIsSavingCategories(true);
          const didUpdate = await updateProgram(editingCategoriesProgram.id, {
            categories,
          });
          setIsSavingCategories(false);
          if (didUpdate) {
            toast.success("Program categories updated.");
          }
          return didUpdate;
        }}
      />

      <EditProgramDescriptionModal
        programName={editingDescriptionProgram?.name ?? ""}
        showModal={!!editingDescriptionProgram}
        setShowModal={(next) => {
          const show =
            typeof next === "function"
              ? next(Boolean(editingDescriptionProgram))
              : next;
          if (!show) setEditingDescriptionProgramId(null);
        }}
        value={descriptionDraft}
        setValue={setDescriptionDraft}
        isSaving={isSavingDescription}
        onSave={async () => {
          if (!editingDescriptionProgram) return;
          setIsSavingDescription(true);
          const didUpdate = await updateProgram(editingDescriptionProgram.id, {
            description: descriptionDraft,
          });
          setIsSavingDescription(false);
          if (didUpdate) {
            toast.success("Program description updated.");
            setEditingDescriptionProgramId(null);
          }
        }}
      />
      <AddProgramModal
        showModal={showAddProgramModal}
        setShowModal={setShowAddProgramModal}
        programSlug={newProgramSlug}
        setProgramSlug={setNewProgramSlug}
        isLoading={isAddingProgram}
        onAdd={async () => {
          if (!newProgramSlug.trim()) return;

          setIsAddingProgram(true);
          const res = await fetch("/api/admin/programs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              programSlug: newProgramSlug.trim(),
            }),
          });

          if (!res.ok) {
            setIsAddingProgram(false);
            toast.error((await res.text()) || "Failed to add program.");
            return;
          }

          await mutate();
          setIsAddingProgram(false);
          setShowAddProgramModal(false);
          setNewProgramSlug("");
          toast.success("Program added to marketplace.");
        }}
      />

      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4 p-6 pb-28">
        <div className="flex justify-end">
          <Button
            text="Add program"
            className="h-8 w-fit"
            onClick={() => setShowAddProgramModal(true)}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {isLoading ? (
            <div className="flex items-center gap-2 px-5 py-6 text-sm text-neutral-500">
              <LoadingSpinner className="size-4" />
              Loading marketplace programs...
            </div>
          ) : programs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-neutral-500">
              No marketplace programs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1010px]">
                <div className="grid grid-cols-[80px_minmax(320px,1fr)_300px_minmax(260px,1fr)_24px] items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <div>Position</div>
                  <div>Program</div>
                  <div>Categories</div>
                  <div className="pl-1">Description</div>
                  <div />
                </div>
                <Reorder.Group
                  axis="y"
                  values={rankedOrderIds}
                  onReorder={setRankedOrderIds}
                  className="divide-y divide-neutral-200"
                >
                  {rankedPrograms.map((program, index) => (
                    <ProgramRow
                      key={program.id}
                      program={program}
                      index={index}
                      onEditCategories={() =>
                        setEditingCategoriesProgramId(program.id)
                      }
                      onEditDescription={() => {
                        setEditingDescriptionProgramId(program.id);
                        setDescriptionDraft(program.description || "");
                      }}
                      onDelete={() => {
                        setProgramToDelete(program);
                        setShowConfirmModal(true);
                      }}
                    />
                  ))}
                </Reorder.Group>
              </div>
            </div>
          )}
        </div>

        {hasOrderChanges && (
          <div className="fixed bottom-4 left-1/2 z-20 w-full max-w-xl -translate-x-1/2 px-4">
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg">
              <p className="text-sm font-medium text-neutral-700">
                Save order changes?
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  text="Discard"
                  className="h-8"
                  onClick={() => setRankedOrderIds(initialRankedOrderIds)}
                />
                <Button
                  text="Save order changes"
                  className="h-8"
                  loading={isSavingOrder}
                  onClick={saveOrderChanges}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ProgramRow({
  program,
  index,
  onEditCategories,
  onEditDescription,
  onDelete,
}: {
  program: MarketplaceProgram;
  index: number;
  onEditCategories: () => void;
  onEditDescription: () => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  const positionLabel = `${index + 1}`;

  const content = (
    <div className="grid grid-cols-[80px_minmax(320px,1fr)_300px_minmax(260px,1fr)_24px] items-center gap-3 px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-neutral-700">
        <button
          type="button"
          className="cursor-grab rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
          aria-label={`Reorder ${program.name}`}
        >
          <GripDotsVertical className="size-4" />
        </button>
        {positionLabel}
        {index <= 2 && (
          <CrownSmall
            className={cn("size-4", {
              "text-amber-400": index === 0,
              "text-neutral-400": index === 1,
              "text-yellow-900": index === 2,
            })}
          />
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className="size-4 rounded-full"
        />
        <span className="truncate text-sm font-medium text-neutral-900">
          {program.name}
        </span>
        <span className="text-neutral-400">•</span>
        {program.url ? (
          <a
            href={program.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
          >
            {getDomainWithoutWWW(program.url)}
          </a>
        ) : (
          <span className="truncate text-sm font-medium text-neutral-500">
            {program.slug}
          </span>
        )}
      </div>

      <ProgramCategoriesList
        categories={program.categories}
        onEdit={onEditCategories}
      />

      <button
        type="button"
        onClick={onEditDescription}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left",
          "transition-colors hover:bg-neutral-50",
        )}
      >
        <PenWriting className="size-3.5 shrink-0 text-neutral-400" />
        <span className="truncate text-sm text-neutral-700">
          {program.description?.trim() || "Add description"}
        </span>
      </button>
      <button
        type="button"
        aria-label={`Remove ${program.name} from marketplace`}
        className={cn(
          "w-fit shrink-0 rounded-md p-2 text-neutral-400 transition-colors",
          "hover:bg-neutral-100 hover:text-neutral-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Xmark className="size-4" />
      </button>
    </div>
  );

  return (
    <Reorder.Item
      value={program.id}
      dragListener={false}
      dragControls={dragControls}
    >
      {content}
    </Reorder.Item>
  );
}

function AddProgramModal({
  showModal,
  setShowModal,
  programSlug,
  setProgramSlug,
  isLoading,
  onAdd,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  programSlug: string;
  setProgramSlug: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  onAdd: () => Promise<void>;
}) {
  const { isMobile } = useMediaQuery();

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!programSlug.trim()) return;
          onAdd();
        }}
      >
        <div className="border-b border-neutral-200 p-4 sm:p-6">
          <h3 className="text-lg font-medium leading-none">Add program</h3>
        </div>
        <div className="p-4 sm:p-6">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-neutral-800">
              Program slug
            </span>
            <input
              type="text"
              value={programSlug}
              onChange={(e) => setProgramSlug(e.target.value)}
              placeholder="example-program"
              autoFocus={!isMobile}
              className={cn(
                "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900",
                "placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
              )}
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            onClick={() => setShowModal(false)}
          />
          <Button
            type="submit"
            text="Add program"
            className="h-8 w-fit px-3"
            loading={isLoading}
            disabled={!programSlug.trim()}
          />
        </div>
      </form>
    </Modal>
  );
}

function EditProgramDescriptionModal({
  showModal,
  setShowModal,
  value,
  setValue,
  onSave,
  isSaving,
  programName,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  value: string;
  setValue: (value: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  programName: string;
}) {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="sm:max-w-lg"
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Program description
        </h3>
        <p className="mt-1 text-sm text-neutral-500">{programName}</p>
      </div>
      <div className="p-4 sm:p-6">
        <textarea
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add marketplace description..."
          className={cn(
            "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900",
            "placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
          )}
        />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          onClick={() => setShowModal(false)}
        />
        <Button
          text="Save"
          className="h-8 w-fit px-3"
          loading={isSaving}
          onClick={onSave}
        />
      </div>
    </Modal>
  );
}
