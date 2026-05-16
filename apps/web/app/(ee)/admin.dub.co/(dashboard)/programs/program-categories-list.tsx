import { MAX_PROGRAM_CATEGORIES } from "@/lib/constants/program";
import {
  PROGRAM_CATEGORIES,
  PROGRAM_CATEGORIES_MAP,
} from "@/lib/network/program-categories";
import { Category } from "@dub/prisma/client";
import { Button, Checkbox, Modal, Tag, Tooltip, TruncatedList } from "@dub/ui";
import { cn } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const categoryPillClassName =
  "bg-bg-inverted/5 text-content-default whitespace-nowrap min-w-0 select-none inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-xs font-semibold leading-tight hover:bg-bg-inverted/10";

const categoryLabel = (category: Category) =>
  PROGRAM_CATEGORIES_MAP[category]?.label ?? category.replaceAll("_", " ");

export function ProgramCategoriesList({
  categories,
  onEdit,
}: {
  categories: Category[];
  onEdit: () => void;
}) {
  return categories.length ? (
    <button
      type="button"
      onClick={onEdit}
      className="w-full min-w-0 text-left"
      aria-label="Edit program categories"
    >
      <TruncatedList
        itemProps={{ className: "shrink-0" }}
        className="flex w-full min-w-0 items-center gap-2"
        overflowIndicator={({ visible, hidden }) => (
          <Tooltip
            content={
              <div className="flex max-w-sm flex-wrap gap-1 p-2">
                {categories.slice(visible).map((category) => (
                  <div key={category} className={categoryPillClassName}>
                    {categoryLabel(category)}
                  </div>
                ))}
              </div>
            }
          >
            <div className={cn(categoryPillClassName, "cursor-default")}>
              +{hidden}
            </div>
          </Tooltip>
        )}
      >
        {categories.map((category) => (
          <div key={category} className={categoryPillClassName}>
            {categoryLabel(category)}
          </div>
        ))}
      </TruncatedList>
    </button>
  ) : (
    <button
      type="button"
      onClick={onEdit}
      aria-label="Add category"
      className={cn(
        categoryPillClassName,
        "group/add-category active:bg-bg-inverted/15 w-fit px-1.5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50",
      )}
    >
      <Tag className="size-3.5" />
      <span className="pl-1 pr-0.5">Add category</span>
    </button>
  );
}

type UpdateProgramCategoriesModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  selectedCategories: Category[];
  onSave: (categories: Category[]) => Promise<boolean>;
  isSaving: boolean;
  programName: string;
};

export function UpdateProgramCategoriesModal({
  showModal,
  setShowModal,
  selectedCategories,
  onSave,
  isSaving,
  programName,
}: UpdateProgramCategoriesModalProps) {
  const [draftCategories, setDraftCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showModal) return;
    setDraftCategories(selectedCategories);
    setSearch("");

    // autoFocus is unreliable in some modal/portal mounts
    setTimeout(() => searchInputRef.current?.focus(), 10);
  }, [showModal, selectedCategories]);

  const draftSet = useMemo(() => new Set(draftCategories), [draftCategories]);
  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return PROGRAM_CATEGORIES;

    return PROGRAM_CATEGORIES.filter(({ id, label }) => {
      const fallbackLabel = id.replaceAll("_", " ");
      return (
        label.toLowerCase().includes(normalizedSearch) ||
        id.toLowerCase().includes(normalizedSearch) ||
        fallbackLabel.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [search]);

  const hasChanges = useMemo(() => {
    if (draftCategories.length !== selectedCategories.length) return true;
    return draftCategories.some(
      (category) => !selectedCategories.includes(category),
    );
  }, [draftCategories, selectedCategories]);

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="sm:max-w-lg"
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Program categories</h3>
        <p className="mt-1 text-sm text-neutral-500">{programName}</p>
      </div>

      <div className="space-y-3 p-4 sm:p-6">
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className={cn(
            "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900",
            "placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
          )}
        />

        <div className="max-h-[52vh] space-y-1 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">
              No categories found.
            </div>
          ) : (
            filteredCategories.map(({ id, label, icon: Icon }) => {
              const isChecked = draftSet.has(id);
              const maxReached =
                !isChecked && draftCategories.length >= MAX_PROGRAM_CATEGORIES;

              return (
                <label
                  key={id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5",
                    "transition-colors hover:bg-neutral-50",
                    maxReached && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-neutral-600" />
                    <span className="text-sm font-medium text-neutral-800">
                      {label}
                    </span>
                  </div>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        setDraftCategories((prev) =>
                          prev.filter((category) => category !== id),
                        );
                        return;
                      }
                      if (maxReached) return;
                      setDraftCategories((prev) => [...prev, id]);
                    }}
                  />
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-4 sm:px-6">
        <p className="text-xs text-neutral-500">
          Select up to {MAX_PROGRAM_CATEGORIES} categories.
        </p>
        <div className="flex items-center gap-2">
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
            disabled={!hasChanges}
            onClick={async () => {
              const didSave = await onSave(draftCategories);
              if (didSave) setShowModal(false);
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
