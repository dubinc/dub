import { useApiMutation } from "@/lib/swr/use-api-mutation";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, PartnerTagProps, TagProps } from "@/lib/types";
import {
  AnimatedSizeContainer,
  Button,
  Checkbox,
  LoadingSpinner,
  Modal,
  useMediaQuery,
  useScrollProgress,
} from "@dub/ui";
import { cn, fetcher, OG_AVATAR_URL } from "@dub/utils";
import { Command } from "cmdk";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { useDebounce } from "use-debounce";

type EditPartnerTagsModalProps = {
  showEditPartnerTagsModal: boolean;
  setShowEditPartnerTagsModal: Dispatch<SetStateAction<boolean>>;
  partners: Pick<EnrolledPartnerProps, "id" | "name" | "image" | "tags">[];
};

function EditPartnerTagsModalContent({
  showEditPartnerTagsModal,
  setShowEditPartnerTagsModal,
  partners,
}: EditPartnerTagsModalProps) {
  const { id: workspaceId } = useWorkspace();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { data: tagsCount } = useSWR<number>(
    `/api/partners/tags/count?workspaceId=${workspaceId}`,
    fetcher,
  );
  const useAsync = true; //tagsCount && tagsCount > TAGS_MAX_PAGE_SIZE;

  const { data: availableTags, isLoading: isLoadingTags } = useSWR<TagProps[]>(
    `/api/partners/tags?workspaceId=${workspaceId}&${new URLSearchParams({
      sortBy: "createdAt",
      sortOrder: "desc",
      ...(useAsync ? { search: debouncedSearch } : {}),
    }).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

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

  const { makeRequest: changeGroup, isSubmitting } = useApiMutation();

  const handleEditPartnerTags = useCallback(async () => {
    // await changeGroup(`/api/groups/${selectedGroupId}/partners`, {
    //   method: "POST",
    //   body: {
    //     workspaceId,
    //     partnerIds: partners.map((p) => p.id),
    //   },
    //   onSuccess: () => {
    //     mutatePrefix("/api/partners");
    //     toast.success("Group changed successfully!");
    //     setShowEditPartnerTagsModal(false);
    //   },
    // });
  }, [changeGroup, partners]);

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

    return tags.map((tag) => {
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
          <Command loop shouldFilter={!useAsync} className="p-1">
            <Command.Input
              ref={inputRef}
              placeholder="Search or add tags..."
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
                </Command.List>
              </div>
              {isLoadingTags && (
                <Command.Loading className="absolute inset-0 flex items-center justify-center bg-white py-4">
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
        <div>
          {partners.length === 1 ? (
            <div className="flex items-center gap-2">
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowEditPartnerTagsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            onClick={() => handleEditPartnerTags()}
            autoFocus
            loading={isSubmitting}
            text="Save"
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
  tag: TagProps;
  partnerCount: number;
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean | "indeterminate") => void;
}) {
  const checkboxRef = useRef<HTMLButtonElement>(null);

  return (
    <Command.Item
      key={tag.id}
      className="group/button flex h-10 items-center gap-2 rounded-lg px-2.5 active:bg-black/5 data-[selected=true]:bg-black/[0.03]"
      onSelect={() => checkboxRef.current?.click()}
      value={tag.name}
    >
      <label className="pointer-events-none flex items-center gap-2">
        <Checkbox
          ref={checkboxRef}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className={cn(
            "border-border-default size-4 rounded data-[state=checked]:bg-black data-[state=indeterminate]:bg-black",
            "transition-transform duration-100 active:scale-95 group-active/button:scale-95",
          )}
          tabIndex={-1}
        />
        <span className="text-content-default flex h-7 select-none items-center rounded-lg bg-black/5 px-2 text-sm font-semibold">
          {tag.name}
        </span>
      </label>
      <span className="text-content-muted text-xs">{partnerCount}</span>
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
