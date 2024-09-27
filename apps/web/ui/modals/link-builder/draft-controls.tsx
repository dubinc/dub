import { LinkWithTagsProps } from "@/lib/types";
import { AnimatedSizeContainer, Button, Popover, useMediaQuery } from "@dub/ui";
import {
  CircleCheck,
  CircleInfo,
  LoadingCircle,
  Xmark,
} from "@dub/ui/src/icons";
import { cn, nanoid, punycode, timeAgo, truncate } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import {
  forwardRef,
  SVGProps,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { LinkFormData } from "./";
import { LinkDraft, useLinkDrafts } from "./use-link-drafts";

export type DraftControlsHandle = {
  onSubmitSuccessful: () => void;
};

type DraftControlsProps = {
  props?: LinkWithTagsProps;
};

export const DraftControls = forwardRef<
  DraftControlsHandle,
  DraftControlsProps
>(({ props }: DraftControlsProps, ref) => {
  const { isMobile } = useMediaQuery();

  const {
    watch,
    getValues,
    setValue,
    formState: { isDirty },
  } = useFormContext<LinkFormData>();

  const [sessionId, setSessionId] = useState(() => nanoid());
  const [isSavePending, setIsSavePending] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);

  const {
    drafts: allDrafts,
    saveDraft,
    removeDraft,
  } = useLinkDrafts({
    linkId: props?.id,
  });

  const drafts = useMemo(() => {
    return allDrafts.filter((draft) => draft.id !== sessionId);
  }, [allDrafts, sessionId]);

  const saveDraftDebounced = useDebouncedCallback(() => {
    saveDraft(sessionId, getValues());
    setIsSavePending(false);
    setHasSaved(true);
  }, 1000);

  // Watch for form changes and save draft
  useEffect(() => {
    const { unsubscribe } = watch(() => {
      const [url, key] = getValues(["url", "key"]);
      if ((url || key) && isDirty) {
        setIsSavePending(true);
        saveDraftDebounced();
      }
    });
    return () => unsubscribe();
  }, [watch, isDirty]);

  useImperativeHandle(
    ref,
    () => {
      return {
        onSubmitSuccessful() {
          // Remove the current draft when it's submitted
          removeDraft(sessionId);
        },
      };
    },
    [sessionId],
  );

  return (isDirty && hasSaved) || drafts.length > 0 ? (
    <Popover
      content={
        <div className="w-full min-w-36 px-1 py-1 sm:w-auto">
          {drafts.length > 0 ? (
            <span className="block pb-2 pl-2.5 pt-2 text-xs font-medium text-gray-500">
              Restore drafts
            </span>
          ) : (
            <span className="block flex gap-1 px-2.5 pb-2 pt-2 text-xs text-gray-500">
              <CircleInfo className="size-3.5" />
              Your drafts will appear here
            </span>
          )}
          {drafts.length > 0 && (
            <AnimatedSizeContainer width={!isMobile} height>
              <ul className="scrollbar-hide grid max-h-40 overflow-y-auto">
                {drafts.map((draft) => (
                  <DraftOption
                    key={draft.id}
                    draft={draft}
                    onSelect={() => {
                      setSessionId(draft.id);
                      setOpenPopover(false);
                      Object.entries(draft.link).forEach(([key, value]) => {
                        setValue(key as any, value, { shouldDirty: true });
                      });
                      toast.success("Draft restored!");
                    }}
                    onDelete={() => removeDraft(draft.id)}
                  />
                ))}
              </ul>
            </AnimatedSizeContainer>
          )}
        </div>
      }
      align="end"
      onWheel={(e) => {
        // Allows scrolling to work when the popover's in a modal
        e.stopPropagation();
      }}
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        type="button"
        variant="outline"
        className={cn(
          "animate-fade-in group h-9 text-sm transition-colors data-[state=open]:bg-gray-200 data-[state=open]:text-gray-700",
          isDirty && hasSaved
            ? "pl-3 pr-4 text-gray-400 hover:text-gray-600"
            : "pl-4 pr-3 text-gray-500 hover:text-gray-700",
        )}
        text={
          isDirty && hasSaved ? (
            <div className="flex items-center justify-end gap-2">
              {isSavePending ? (
                <LoadingCircle className="size-3.5" />
              ) : (
                <CircleCheck className="size-3.5" />
              )}
              {isSavePending ? "Saving..." : "Draft saved"}
            </div>
          ) : drafts.length > 0 ? (
            <div className="flex items-center justify-end gap-1">
              Drafts
              <ChevronDown className="size-3.5 transition-transform duration-75 group-data-[state=open]:rotate-180" />
            </div>
          ) : null
        }
      />
    </Popover>
  ) : null;
});

function DraftOption({
  draft,
  onSelect,
  onDelete,
}: {
  draft: LinkDraft;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { isMobile } = useMediaQuery();

  // Memoize time so it doesn't change on rerender
  const time = useMemo(
    () => timeAgo(new Date(draft.timestamp), { withAgo: !isMobile }),
    [draft.timestamp, isMobile],
  );

  return (
    <li
      key={draft.id}
      role="button"
      className="group flex items-center justify-between gap-2 overflow-hidden rounded py-1.5 pl-2 pr-1.5 text-sm transition-colors hover:bg-gray-100 sm:gap-1"
      onClick={() => {
        onSelect();
      }}
    >
      <div className="flex min-w-0 grow items-center justify-between gap-4 sm:gap-8">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
          <RestoreDraftIcon className="size-3.5 shrink-0 text-gray-400" />
          <span className="min-w-0 max-w-40 truncate text-gray-800">
            {truncate(punycode(draft.link.domain), 16)}/
            {draft.link.key ? (
              punycode(draft.link.key)
            ) : (
              <span className="text-gray-400">(link)</span>
            )}
          </span>
        </div>
        <span className="whitespace-nowrap text-xs text-gray-500">{time}</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          window.confirm("Are you sure you want to delete this draft?") &&
            onDelete();
        }}
        className="p-1 text-gray-400 transition-colors hover:text-gray-500"
        title="Delete draft"
      >
        <Xmark className="size-3.5" />
      </button>
    </li>
  );
}

function RestoreDraftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <polyline
          fill="none"
          points="9 4.75 9 9 12.25 11.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <g className="origin-center group-hover:rotate-[360deg] group-hover:transition-transform group-hover:duration-500">
          <polyline
            fill="none"
            points="1.88 14.695 2.288 11.75 5.232 12.157"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M1.75,9C1.75,4.996,4.996,1.75,9,1.75s7.25,3.246,7.25,7.25-3.246,7.25-7.25,7.25c-3.031,0-5.627-1.86-6.71-4.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </g>
      </g>
    </svg>
  );
}
