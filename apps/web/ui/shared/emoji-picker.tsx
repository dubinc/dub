import { Button, Popover } from "@dub/ui";
import { FaceSmile } from "@dub/ui/icons";
import { EmojiPicker as EmojiPickerBase } from "frimousse";
import {
  PropsWithChildren,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

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
          className="isolate flex h-[300px] w-fit flex-col"
          onKeyDownCapture={handleBackspaceClose}
        >
          <EmojiPickerBase.Root
            className="flex min-h-0 flex-1 flex-col"
            onEmojiSelect={({ emoji }) => {
              onSelect(emoji);
              setOpenPopover(false);
            }}
          >
            <EmojiPickerBase.Search className="border-border-default focus:border-border-default z-10 rounded-t-lg border-0 border-b bg-white px-3 py-2.5 text-base outline-none placeholder:text-neutral-400 focus:ring-0 sm:text-sm" />
            <EmojiPickerBase.Viewport className="outline-hidden relative flex-1">
              <EmojiPickerBase.Loading className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                Loading…
              </EmojiPickerBase.Loading>
              <EmojiPickerBase.Empty className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                No emoji found.
              </EmojiPickerBase.Empty>
              <EmojiPickerBase.List
                className="select-none pb-1.5"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      className="text-content-subtle bg-white px-3 pb-1.5 pt-3 text-xs font-medium"
                      {...props}
                    >
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...props }) => (
                    <div className="scroll-my-1.5 px-1.5" {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button
                      className="flex size-7 items-center justify-center rounded-md text-lg data-[active]:bg-neutral-100"
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
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
