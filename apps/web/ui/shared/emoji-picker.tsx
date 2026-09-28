import type { EmojiMatch } from "@/lib/ai/search-emojis";
import { Button, Popover } from "@dub/ui";
import { FaceSmile } from "@dub/ui/icons";
import { EmojiPicker as EmojiPickerBase } from "frimousse";
import {
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  DUB_EMOJI_MATCHES,
  normalizeEmojiQuery,
  useSemanticEmojiSearch,
} from "./use-semantic-emoji-search";

const EMOJI_COLUMNS = 9;

function EmojiMatchGrid({
  matches,
  onSelect,
}: {
  matches: EmojiMatch[];
  onSelect: (emoji: string) => void;
}) {
  const rows = Array.from(
    { length: Math.ceil(matches.length / EMOJI_COLUMNS) },
    (_, index) =>
      matches.slice(index * EMOJI_COLUMNS, (index + 1) * EMOJI_COLUMNS),
  );

  return (
    <div className="w-full select-none pb-1.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full px-1.5">
          {row.map((match) => (
            <button
              key={`${match.label}-${match.emoji}`}
              type="button"
              aria-label={match.label}
              className="flex aspect-square w-[10%] shrink-0 items-center justify-center rounded-md text-xl transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] data-[active]:bg-neutral-100 sm:aspect-auto sm:size-7 sm:text-lg [@media(hover:hover)_and_(pointer:fine)]:hover:bg-neutral-100"
              style={{ fontFamily: "var(--frimousse-emoji-font)" }}
              onClick={() => onSelect(match.emoji)}
            >
              {match.emoji}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function EmojiSkeleton() {
  return (
    <div className="w-full pt-1.5" aria-hidden>
      {Array.from({ length: 8 }, (_, row) => (
        <div key={row} className="flex w-full px-1.5">
          {Array.from({ length: EMOJI_COLUMNS }, (_, column) => (
            <div
              key={column}
              className="flex aspect-square w-[10%] shrink-0 items-center justify-center rounded-md sm:aspect-auto sm:size-7"
            >
              <span className="size-5 animate-pulse rounded-md bg-neutral-200/80 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EmojiSearchFallback({
  search,
  onSelect,
}: {
  search: string;
  onSelect: (emoji: string) => void;
}) {
  const query = normalizeEmojiQuery(search);
  const semantic = useSemanticEmojiSearch(query, query.length >= 2);

  if (semantic.status === "loading") {
    return <EmojiSkeleton />;
  }

  if (semantic.status !== "ready") {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
        No emoji found.
      </div>
    );
  }

  return <EmojiMatchGrid matches={semantic.matches} onSelect={onSelect} />;
}

type EmojiPickerProps = PropsWithChildren<{
  onSelect: (emoji: string) => void;
  openPopover?: boolean;
  setOpenPopover?: (open: boolean) => void;
  onKeyboardDismissFocusEditor?: () => void;
  anchorRect?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null;
}>;

export function EmojiPicker({
  onSelect,
  children,
  openPopover: controlledOpen,
  setOpenPopover: controlledSetOpen,
  onKeyboardDismissFocusEditor,
  anchorRect,
}: EmojiPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled =
    controlledOpen !== undefined && controlledSetOpen !== undefined;
  const openPopover = isControlled ? controlledOpen : internalOpen;
  const setOpenPopover = isControlled ? controlledSetOpen : setInternalOpen;
  const keyboardDismissRef = useRef(false);
  const [search, setSearch] = useState("");
  const showDubEasterEgg = normalizeEmojiQuery(search) === "dub";
  const selectEmoji = (emoji: string) => {
    onSelect(emoji);
    setOpenPopover(false);
  };

  useEffect(() => {
    if (!openPopover) setSearch("");
  }, [openPopover]);

  const anchorEl = anchorRect ? (
    <div
      style={{
        position: "fixed",
        top: anchorRect.top,
        left: anchorRect.left,
        width: Math.max(anchorRect.right - anchorRect.left, 1),
        height: Math.max(anchorRect.bottom - anchorRect.top, 1),
        pointerEvents: "none",
      }}
    />
  ) : undefined;

  const handleBackspaceClose = (e: ReactKeyboardEvent) => {
    if (e.key !== "Backspace") return;
    const target = e.target;
    if (target instanceof HTMLInputElement && target.value.length > 0) return;
    if (target instanceof HTMLTextAreaElement && target.value.length > 0)
      return;
    e.preventDefault();
    e.stopPropagation();
    keyboardDismissRef.current = true;
    setOpenPopover(false);
  };

  return (
    <Popover
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      side="top"
      align="start"
      sideOffset={anchorRect ? 6 : 38}
      anchor={anchorEl}
      onEscapeKeyDown={() => {
        keyboardDismissRef.current = true;
      }}
      onCloseAutoFocus={(e) => {
        if (!keyboardDismissRef.current) return;
        keyboardDismissRef.current = false;
        if (onKeyboardDismissFocusEditor) {
          e.preventDefault();
          setTimeout(() => onKeyboardDismissFocusEditor(), 0);
        }
      }}
      content={
        <div
          className="isolate flex h-[300px] w-full flex-col sm:w-[17.25rem]"
          onKeyDownCapture={(event) => {
            handleBackspaceClose(event);
            if (!showDubEasterEgg) return;
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement
            ) {
              event.preventDefault();
              event.stopPropagation();
              selectEmoji(DUB_EMOJI_MATCHES[0].emoji);
              return;
            }
            if (event.key.startsWith("Arrow")) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <EmojiPickerBase.Root
            className="flex min-h-0 w-full flex-1 flex-col"
            onEmojiSelect={({ emoji }) => selectEmoji(emoji)}
          >
            <EmojiPickerBase.Search
              onChange={(event) => setSearch(event.target.value)}
              className="border-border-default focus:border-border-default z-10 w-full border-0 border-b bg-white px-3 py-2.5 text-base outline-none placeholder:text-neutral-400 focus:ring-0 sm:rounded-t-lg sm:text-sm"
            />
            <EmojiPickerBase.Viewport className="outline-hidden relative w-full flex-1">
              <EmojiPickerBase.Loading className="absolute inset-0 overflow-hidden">
                <EmojiSkeleton />
              </EmojiPickerBase.Loading>
              <EmojiPickerBase.Empty className="absolute inset-0 block overflow-y-auto">
                {({ search }) => (
                  <EmojiSearchFallback search={search} onSelect={selectEmoji} />
                )}
              </EmojiPickerBase.Empty>
              <EmojiPickerBase.List
                className="w-full select-none pb-1.5"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      className="text-content-subtle w-full bg-white px-3 pb-1.5 pt-3 text-xs font-medium"
                      {...props}
                    >
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...props }) => (
                    <div className="w-full scroll-my-1.5 px-1.5" {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button
                      className="flex aspect-square w-[10%] shrink-0 items-center justify-center rounded-md text-xl data-[active]:bg-neutral-100 sm:aspect-auto sm:size-7 sm:text-lg"
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
              {showDubEasterEgg && (
                <div className="absolute inset-0 z-10 overflow-y-auto bg-white">
                  <EmojiMatchGrid
                    matches={DUB_EMOJI_MATCHES}
                    onSelect={selectEmoji}
                  />
                </div>
              )}
            </EmojiPickerBase.Viewport>
          </EmojiPickerBase.Root>
        </div>
      }
    >
      {children || (
        <Button
          type="button"
          variant="outline"
          icon={<FaceSmile className="size-4" />}
          className="size-8 p-0"
        />
      )}
    </Popover>
  );
}
