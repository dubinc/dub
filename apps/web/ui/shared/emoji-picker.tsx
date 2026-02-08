import { Button, Popover } from "@dub/ui";
import { FaceSmile } from "@dub/ui/icons";
import { EmojiPicker as EmojiPickerBase } from "frimousse";
import { PropsWithChildren, useState } from "react";

export function EmojiPicker({
  onSelect,
  children,
}: PropsWithChildren<{
  onSelect: (emoji: string) => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      side="top"
      align="start"
      sideOffset={34}
      content={
        <EmojiPickerBase.Root
          className="isolate flex h-[300px] w-fit flex-col"
          onEmojiSelect={({ emoji }) => {
            onSelect(emoji);
            setIsOpen(false);
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
