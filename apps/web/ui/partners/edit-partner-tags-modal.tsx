import { parseActionError } from "@/lib/actions/parse-action-errors";
import { createPartnerTagAction } from "@/lib/actions/partners/tags/create-partner-tag";
import { deletePartnerTagAction } from "@/lib/actions/partners/tags/delete-partner-tag";
import { updatePartnerTagAction } from "@/lib/actions/partners/tags/update-partner-tag";
import { updatePartnerTagsAction } from "@/lib/actions/partners/tags/update-partner-tags";
import { mutatePrefix } from "@/lib/swr/mutate";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { usePartnerTagsCount } from "@/lib/swr/use-partner-tags-count";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, PartnerTagProps } from "@/lib/types";
import { PARTNER_TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-tags";
import {
  AnimatedSizeContainer,
  Button,
  Checkbox,
  LoadingSpinner,
  MenuItem,
  Modal,
  PenWriting,
  Plus2,
  Popover,
  Tag,
  Trash,
  useMediaQuery,
  Users,
  useScrollProgress,
} from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { ThreeDots } from "../shared/icons";

const itemClassName =
  "group/button flex h-10 cursor-pointer items-center justify-between gap-4 rounded-lg px-2.5 data-[selected=true]:bg-black/[0.03]";

type EditPartnerTagsModalProps = {
  showEditPartnerTagsModal: boolean;
  setShowEditPartnerTagsModal: Dispatch<SetStateAction<boolean>>;
  partners: Pick<EnrolledPartnerProps, "id" | "name" | "image" | "tags">[];
};

function EditPartnerTagsModalContent({
  setShowEditPartnerTagsModal,
  partners,
}: EditPartnerTagsModalProps) {
  const { id: workspaceId } = useWorkspace();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partnerTagsCount } = usePartnerTagsCount();
  const useAsync =
    partnerTagsCount && partnerTagsCount > PARTNER_TAGS_MAX_PAGE_SIZE;

  const { partnerTags: availableTags, isLoading: isLoadingTags } =
    usePartnerTags({
      query: useAsync
        ? {
            search: debouncedSearch,
          }
        : undefined,
    });

  const noTagsAdded = availableTags && availableTags.length === 0 && !search;

  const { partnersCount: partnerCounts } = usePartnersCount<
    | {
        partnerTagId: string;
        _count: number;
      }[]
    | undefined
  >({
    ignoreParams: true,
    groupBy: "partnerTagId",
  });

  const [selectionState, setSelectionState] = useState<{
    added: PartnerTagProps[];
    removed: PartnerTagProps[];
  }>({
    added: [],
    removed: [],
  });

  const tagOptions = useMemo(() => {
    if (!availableTags) return undefined;

    const { added: addedTags, removed: removedTags } = selectionState;
    let tags = availableTags;

    // Add any unloaded tags that were added/removed
    tags = [
      ...tags,
      ...addedTags.filter((at) => !tags.find((t) => t.id === at.id)),
    ];
    tags = [
      ...tags,
      ...removedTags.filter((rt) => !tags.find((t) => t.id === rt.id)),
    ];

    const partnerTagIds = partners.flatMap(
      (p) => p.tags?.map(({ id }) => id) ?? [],
    );

    return tags
      .sort((a, b) => partnerTagIds.indexOf(b.id) - partnerTagIds.indexOf(a.id))
      .map((tag) => {
        const existing = Boolean(partnerTagIds.includes(tag.id));
        const allExisting = partners.every((p) =>
          p.tags?.some((t) => t.id === tag.id),
        );
        const added = Boolean(addedTags.find((at) => at.id === tag.id));
        const removed = Boolean(removedTags.find((rt) => rt.id === tag.id));

        const checkedState: boolean | "indeterminate" = removed
          ? false
          : added || (allExisting && !removed)
            ? true
            : existing
              ? "indeterminate"
              : false;

        return { ...tag, checkedState };
      });
  }, [partners, availableTags, selectionState]);

  const { executeAsync: updatePartnerTags, isPending } = useAction(
    updatePartnerTagsAction,
    {
      onSuccess: () => {
        toast.success("Partner tags updated successfully!");
        setShowEditPartnerTagsModal(false);
        mutatePrefix("/api/partners");
      },
      onError: ({ error }) => {
        toast.error(parseActionError(error, "Failed to update partner tags"));
      },
    },
  );

  const handleSave = useCallback(async () => {
    if (!workspaceId) return;

    await updatePartnerTags({
      workspaceId,
      partnerIds: partners.map(({ id }) => id),
      addTagIds: selectionState.added.map(({ id }) => id),
      removeTagIds: selectionState.removed.map(({ id }) => id),
    });
  }, [workspaceId, partners, updatePartnerTags, selectionState]);

  const { executeAsync: createPartnerTag, isPending: isCreatingPartnerTag } =
    useAction(createPartnerTagAction, {
      onSuccess: ({ data }) => {
        toast.success("Partner tag created successfully!");
        mutatePrefix("/api/partners/tags");

        if (data?.partnerTag)
          setSelectionState((state) => ({
            ...state,
            added: [...state.added, data.partnerTag],
          }));
      },
      onError: ({ error }) => {
        toast.error(parseActionError(error, "Failed to create partner tag"));
      },
    });

  const { isMobile } = useMediaQuery();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input automatically, since autoFocus doesn't work here
  useEffect(() => {
    inputRef.current &&
      !isMobile &&
      setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <>
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Partner tags</h3>
      </div>

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <AnimatedSizeContainer
          height
          transition={{ ease: "easeOut", duration: 0.1 }}
          className="pointer-events-auto -m-1 overflow-clip"
        >
          <Command loop shouldFilter={!useAsync} className="p-1 pb-2">
            <Command.Input
              ref={inputRef}
              placeholder={
                noTagsAdded ? "Add tags..." : "Search or add tags..."
              }
              onValueChange={setSearch}
              className="border-border-default placeholder:text-content-muted w-full rounded-lg border px-2.5 py-2 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
            />
            <div className="relative">
              <div
                ref={scrollRef}
                onScroll={updateScrollProgress}
                className="scrollbar-hide max-h-[calc(100dvh-250px)] overflow-y-auto"
              >
                <Command.List className="mt-4">
                  {tagOptions?.map((tag) => (
                    <TagOption
                      key={tag.id}
                      tag={tag}
                      partnerCount={
                        partnerCounts?.find((pc) => pc.partnerTagId === tag.id)
                          ?._count ?? 0
                      }
                      checked={tag.checkedState}
                      onCheckedChange={(checked) => {
                        setSelectionState(({ added, removed }) => ({
                          added: checked
                            ? [...added.filter((at) => at.id !== tag.id), tag]
                            : added.filter((at) => at.id !== tag.id),
                          removed: checked
                            ? removed.filter((rt) => rt.id !== tag.id)
                            : [
                                ...removed.filter((rt) => rt.id !== tag.id),
                                tag,
                              ],
                        }));
                      }}
                    />
                  ))}

                  {Boolean(search?.length) &&
                    !tagOptions?.some((t) => t.name === search) && (
                      <Command.Item
                        className={cn(
                          itemClassName,
                          "justify-start",
                          isCreatingPartnerTag && "bg-black/[0.03]",
                        )}
                        onSelect={() =>
                          createPartnerTag({
                            workspaceId: workspaceId!,
                            name: search,
                          })
                        }
                        value={`create::${search}`}
                        disabled={isCreatingPartnerTag}
                        forceMount
                      >
                        {isCreatingPartnerTag ? (
                          <LoadingSpinner className="size-3.5 shrink-0" />
                        ) : (
                          <Plus2 className="size-3.5 shrink-0" />
                        )}
                        <span className="min-w-0 truncate text-sm font-medium">
                          Create new tag "{search}"
                        </span>
                      </Command.Item>
                    )}
                </Command.List>

                <Command.Empty className="text-content-default flex select-none flex-col items-center justify-center gap-2 py-12">
                  <Tag className="size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    No tags {noTagsAdded ? "added" : "found"}
                  </span>
                </Command.Empty>
              </div>
              {isLoadingTags && (
                <Command.Loading
                  className={cn(
                    "absolute inset-0 top-1 flex items-center justify-center bg-white py-4",
                    tagOptions?.length && "opacity-50",
                  )}
                >
                  <LoadingSpinner className="size-4" />
                </Command.Loading>
              )}

              <div
                className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
                style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
              />
            </div>
          </Command>
        </AnimatedSizeContainer>
      </div>

      <div className="border-border-subtle flex items-center justify-between gap-4 border-t px-4 py-4">
        {partners.length === 1 ? (
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={partners[0].image || `${OG_AVATAR_URL}${partners[0].name}`}
              alt={partners[0].name}
              className="size-6 shrink-0 rounded-full bg-white"
            />
            <h4 className="min-w-0 truncate text-sm font-medium text-neutral-900">
              {partners[0].name}
            </h4>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center">
              {partners.slice(0, 3).map((partner, index) => (
                <img
                  key={partner.id}
                  src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                  alt={partner.name}
                  className={cn(
                    "inline-block size-6 rounded-full border-2 border-white bg-white",
                    index > 0 && "-ml-2.5",
                  )}
                />
              ))}
            </div>
            <span className="text-content-default min-w-0 truncate text-sm font-medium">
              {partners.length} partners selected
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowEditPartnerTagsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            onClick={handleSave}
            loading={isPending}
            text="Save"
            disabled={
              !selectionState.added.length && !selectionState.removed.length
            }
            className="h-8 w-fit px-3"
          />
        </div>
      </div>
    </>
  );
}

function EditPartnerTagsModal(props: EditPartnerTagsModalProps) {
  return (
    <Modal
      showModal={props.showEditPartnerTagsModal}
      setShowModal={props.setShowEditPartnerTagsModal}
      className="focus:outline-none"
    >
      <EditPartnerTagsModalContent {...props} />
    </Modal>
  );
}

function TagOption({
  tag,
  partnerCount,
  checked,
  onCheckedChange,
}: {
  tag: PartnerTagProps;
  partnerCount: number;
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean | "indeterminate") => void;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: deletePartnerTag, isPending: isDeletingPartnerTag } =
    useAction(deletePartnerTagAction, {
      onSuccess: () => {
        toast.success("Partner tag deleted successfully!");
        mutatePrefix("/api/partners");
      },
      onError: ({ error }) => {
        toast.error(parseActionError(error, "Failed to delete partner tag"));
      },
    });

  const checkboxRef = useRef<HTMLButtonElement>(null);

  const [openPopover, setOpenPopover] = useState(false);

  const [editedTagName, setEditedTagName] = useState(tag.name);
  const [isEditing, setIsEditing] = useState(false);

  const { executeAsync: updatePartnerTag, isPending: isUpdatingPartnerTag } =
    useAction(updatePartnerTagAction, {
      onSuccess: () => {
        toast.success("Partner tag updated successfully!");
        mutatePrefix("/api/partners");
      },
      onError: ({ error }) => {
        toast.error(parseActionError(error, "Failed to update partner tag"));
      },
    });

  const handleSave = () => {
    setIsEditing(false);

    if (!workspaceId || editedTagName === tag.name) return;

    updatePartnerTag({
      workspaceId,
      partnerTagId: tag.id,
      name: editedTagName,
    });
  };

  return (
    <Command.Item
      key={tag.id}
      className={itemClassName}
      onSelect={() => checkboxRef.current?.click()}
      value={tag.name}
    >
      <div className="flex min-w-0 items-center gap-2">
        <label className="pointer-events-none flex min-w-0 items-center gap-2">
          <Checkbox
            ref={checkboxRef}
            checked={checked}
            onCheckedChange={onCheckedChange}
            className={cn(
              "border-border-default size-4 shrink-0 rounded data-[state=checked]:bg-black data-[state=indeterminate]:bg-black",
              "transition-transform duration-100 active:scale-95 group-active/button:scale-95",
            )}
            tabIndex={-1}
          />
          {isEditing ? (
            <input
              value={editedTagName}
              onChange={(e) => setEditedTagName(e.target.value)}
              onBlur={() => handleSave()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
              className="border-border-subtle focus:border-border-subtle h-7 rounded-lg border px-2 focus:ring-0 sm:text-sm"
            />
          ) : (
            <div className="flex h-7 min-w-0 select-none items-center rounded-lg bg-black/5 px-2">
              <span className="text-content-default min-w-0 truncate text-sm font-semibold">
                {editedTagName}
              </span>
            </div>
          )}
        </label>
      </div>
      <div className="flex items-center gap-2">
        {Boolean(partnerCount) && (
          <div className="text-content-default flex items-center gap-1">
            <Users className="size-3.5 shrink-0" />
            <span className="text-sm font-medium tabular-nums">
              {partnerCount}
            </span>
          </div>
        )}

        <Popover
          content={
            <div className="flex min-w-32 flex-col gap-1 p-1">
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation();

                  setEditedTagName(tag.name);
                  setIsEditing(true);
                  setOpenPopover(false);
                }}
                icon={<PenWriting className="size-4" />}
              >
                Edit
              </MenuItem>
              <MenuItem
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();

                  if (
                    !window.confirm(
                      "Are you sure you want to delete this partner tag? This action cannot be undone.",
                    )
                  )
                    return;

                  deletePartnerTag({
                    workspaceId: workspaceId!,
                    partnerTagId: tag.id,
                  });

                  setOpenPopover(false);
                }}
                icon={<Trash className="size-4" />}
              >
                Delete
              </MenuItem>
            </div>
          }
          align="end"
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <Button
            variant="outline"
            icon={<ThreeDots className="size-4" />}
            className="size-7 rounded-lg p-0 hover:bg-black/5 active:bg-black/10 disabled:border-transparent disabled:bg-transparent"
            loading={isUpdatingPartnerTag || isDeletingPartnerTag}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </Popover>
      </div>
    </Command.Item>
  );
}

export function useEditPartnerTagsModal({
  partners,
}: Pick<EditPartnerTagsModalProps, "partners">) {
  const [showEditPartnerTagsModal, setShowEditPartnerTagsModal] =
    useState(false);

  const EditPartnerTagsModalCallback = useCallback(() => {
    return (
      <EditPartnerTagsModal
        showEditPartnerTagsModal={showEditPartnerTagsModal}
        setShowEditPartnerTagsModal={setShowEditPartnerTagsModal}
        partners={partners}
      />
    );
  }, [showEditPartnerTagsModal, setShowEditPartnerTagsModal, partners]);

  return useMemo(
    () => ({
      setShowEditPartnerTagsModal,
      EditPartnerTagsModal: EditPartnerTagsModalCallback,
    }),
    [setShowEditPartnerTagsModal, EditPartnerTagsModalCallback],
  );
}
