"use client";

import {
  ProgramCategoriesList,
  UpdateProgramCategoriesModal,
} from "@/ui/partners/program-categories-list";
import { Category } from "@dub/prisma/client";
import {
  Button,
  CrownSmall,
  GripDotsVertical,
  LoadingSpinner,
  Modal,
  PenWriting,
} from "@dub/ui";
import { cn, fetcher, getDomainWithoutWWW, OG_AVATAR_URL } from "@dub/utils";
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
  const { data, isLoading } = useSWR<{ programs: MarketplaceProgram[] }>(
    "/api/admin/programs",
    fetcher,
    { keepPreviousData: true },
  );

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
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  useEffect(() => {
    if (!data?.programs) return;

    setPrograms(data.programs);

    const nextRankedOrder = data.programs
      .filter(
        (program) => program.marketplaceRanking !== MAX_MARKETPLACE_RANKING,
      )
      .map((program) => program.id);

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

  const unrankedPrograms = useMemo(
    () =>
      programs.filter(
        (program) => program.marketplaceRanking === MAX_MARKETPLACE_RANKING,
      ),
    [programs],
  );

  const hasOrderChanges = useMemo(() => {
    if (rankedOrderIds.length !== initialRankedOrderIds.length) return true;
    return rankedOrderIds.some(
      (id, index) => id !== initialRankedOrderIds[index],
    );
  }, [rankedOrderIds, initialRankedOrderIds]);

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
    const updates = rankedOrderIds
      .map((programId, index) => ({
        programId,
        marketplaceRanking: index + 1,
      }))
      .filter(({ programId, marketplaceRanking }) => {
        const originalProgram = programsById[programId];
        return originalProgram?.marketplaceRanking !== marketplaceRanking;
      });

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

  return (
    <>
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

      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4 p-6 pb-28">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-neutral-900">Programs</h1>
          <p className="text-sm text-neutral-600">
            Manage marketplace ranking, categories, and listing descriptions.
          </p>
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
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[80px_minmax(320px,1fr)_300px_minmax(260px,1fr)] items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <div>Position</div>
                  <div>Program</div>
                  <div>Categories</div>
                  <div className="pl-1">Description</div>
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
                      draggable
                      onEditCategories={() =>
                        setEditingCategoriesProgramId(program.id)
                      }
                      onEditDescription={() => {
                        setEditingDescriptionProgramId(program.id);
                        setDescriptionDraft(program.description || "");
                      }}
                    />
                  ))}
                </Reorder.Group>

                {unrankedPrograms.length > 0 && (
                  <div className="border-t border-dashed border-neutral-200">
                    <div className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Unranked marketplace listings
                    </div>
                    <div className="divide-y divide-neutral-200">
                      {unrankedPrograms.map((program) => (
                        <ProgramRow
                          key={program.id}
                          program={program}
                          index={-1}
                          draggable={false}
                          onEditCategories={() =>
                            setEditingCategoriesProgramId(program.id)
                          }
                          onEditDescription={() => {
                            setEditingDescriptionProgramId(program.id);
                            setDescriptionDraft(program.description || "");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
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
  draggable,
  onEditCategories,
  onEditDescription,
}: {
  program: MarketplaceProgram;
  index: number;
  draggable: boolean;
  onEditCategories: () => void;
  onEditDescription: () => void;
}) {
  const dragControls = useDragControls();
  const positionLabel = draggable ? `${index + 1}` : "—";

  const content = (
    <div className="grid grid-cols-[80px_minmax(320px,1fr)_300px_minmax(260px,1fr)] items-center gap-3 px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-neutral-700">
        {draggable && (
          <button
            type="button"
            className="cursor-grab rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e)}
            aria-label={`Reorder ${program.name}`}
          >
            <GripDotsVertical className="size-4" />
          </button>
        )}
        {positionLabel}
        {draggable && index <= 2 && (
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
    </div>
  );

  if (!draggable) {
    return content;
  }

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
