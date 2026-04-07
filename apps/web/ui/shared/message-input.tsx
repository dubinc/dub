import { MAX_MESSAGE_LENGTH } from "@/lib/zod/schemas/messages";
import {
  ArrowTurnLeft,
  Button,
  FaceSmile,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  RichTextToolbarButton,
  useRichTextContext,
  useScrollProgress,
} from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { EmojiPicker } from "../shared/emoji-picker";

export function MessageInput({
  onSendMessage,
  defaultValue,
  onCancel,
  autoFocus,
  placeholder = "Type a message...",
  sendButtonText = "Send",
  className,
}: {
  onSendMessage: (message: string) => void | false;
  defaultValue?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  sendButtonText?: string;
  className?: string;
}) {
  const richTextRef = useRef<{ setContent: (content: any) => void }>(null);
  const [typedMessage, setTypedMessage] = useState(defaultValue || "");
  const [emojiPickerOpen, setEmojiPickerOpenState] = useState(false);
  const [cursorRect, setCursorRect] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);
  const stripColonOnEmojiPickRef = useRef(false);

  const setEmojiPickerOpen = useCallback((open: boolean) => {
    stripColonOnEmojiPickRef.current = false;
    if (!open) setCursorRect(null);
    setEmojiPickerOpenState(open);
  }, []);

  const isSendDisabled = typedMessage.trim().length >= MAX_MESSAGE_LENGTH;

  const sendMessage = () => {
    const message = typedMessage.trim();
    if (!message || message.length >= MAX_MESSAGE_LENGTH) return;

    if (onSendMessage(message) !== false) {
      setTypedMessage("");
      richTextRef.current?.setContent("");
    }
  };

  return (
    <div
      className={cn(
        "border-border-subtle overflow-hidden rounded-xl border focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
        className,
      )}
    >
      <RichTextProvider
        ref={richTextRef}
        features={["bold", "italic", "links"]}
        style="condensed"
        markdown
        autoFocus={autoFocus}
        placeholder={placeholder}
        editorClassName="block max-h-[min(40dvh,15rem)] w-full resize-none border-none overflow-auto scrollbar-hide p-3 text-base sm:max-h-64 sm:text-sm md:max-h-80 lg:max-h-96"
        initialValue={defaultValue}
        onChange={(editor) => setTypedMessage((editor as any).getMarkdown())}
        editorProps={{
          handleDOMEvents: {
            keydown: (view, e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
                return false;
              }
              if (e.key === ":" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const { $from } = view.state.selection;
                const afterHardBreak =
                  $from.nodeBefore?.type.name === "hardBreak";
                const atBlockStart = $from.parentOffset === 0;
                const afterWhitespace =
                  $from.parentOffset > 0 &&
                  /\s/.test(
                    $from.parent.textBetween(
                      $from.parentOffset - 1,
                      $from.parentOffset,
                    ),
                  );
                if (atBlockStart || afterWhitespace || afterHardBreak) {
                  const coords = view.coordsAtPos(view.state.selection.from);
                  setCursorRect(coords);
                  setTimeout(() => {
                    stripColonOnEmojiPickRef.current = true;
                    setEmojiPickerOpenState(true);
                  }, 0);
                }
              }
            },
          },
        }}
      >
        <div className="relative">
          <RichTextArea />
          <MessageInputEditorOverflowFades />
        </div>

        <div className="flex items-center justify-between gap-4 p-3">
          <MessageInputToolbar
            emojiPickerOpen={emojiPickerOpen}
            setEmojiPickerOpen={setEmojiPickerOpen}
            stripColonOnEmojiPickRef={stripColonOnEmojiPickRef}
            cursorRect={cursorRect}
          />
          <div className="flex items-center justify-between gap-2">
            {onCancel && (
              <Button
                variant="secondary"
                text="Cancel"
                onClick={onCancel}
                className="h-8 w-fit rounded-lg px-4"
              />
            )}
            <Button
              variant="primary"
              text={
                <span className="flex items-center gap-2">
                  {sendButtonText}
                  <span className="hidden items-center gap-1 sm:flex">
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border text-[0.625rem]",
                        isSendDisabled
                          ? "border-neutral-300 text-neutral-400"
                          : "border-neutral-700 group-disabled:border-neutral-300 group-disabled:text-neutral-400",
                      )}
                    >
                      {navigator.platform.startsWith("Mac") ? "⌘" : "^"}
                    </span>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        isSendDisabled
                          ? "border-neutral-300"
                          : "border-neutral-700 group-disabled:border-neutral-300",
                      )}
                    >
                      <ArrowTurnLeft
                        className={cn(
                          "size-2.5",
                          isSendDisabled
                            ? "text-neutral-400"
                            : "text-content-inverted group-disabled:text-neutral-400",
                        )}
                      />
                    </span>
                  </span>
                </span>
              }
              disabledTooltip={
                typedMessage.trim().length >= MAX_MESSAGE_LENGTH
                  ? `Message must be less than ${nFormatter(MAX_MESSAGE_LENGTH)} characters`
                  : undefined
              }
              onClick={sendMessage}
              className="h-8 w-fit rounded-lg px-4"
            />
          </div>
        </div>
      </RichTextProvider>
    </div>
  );
}

function MessageInputEditorOverflowFades() {
  const { editor } = useRichTextContext();
  const scrollElRef = useRef<HTMLElement | null>(null);
  const prevScrollTopRef = useRef(0);
  const [scrollDirection, setScrollDirection] = useState<"down" | "up" | null>(
    null,
  );

  const { scrollProgress, updateScrollProgress } = useScrollProgress(
    scrollElRef as RefObject<HTMLElement>,
  );

  useEffect(() => {
    if (!editor) return;

    const root = editor.view.dom as HTMLElement;
    const scrollEl =
      (editor.view as { scrollDOM?: HTMLElement }).scrollDOM ?? root;

    scrollElRef.current = scrollEl;
    updateScrollProgress();

    const onScroll = () => {
      setScrollDirection(
        scrollEl.scrollTop > prevScrollTopRef.current ? "down" : "up",
      );
      prevScrollTopRef.current = scrollEl.scrollTop;
      updateScrollProgress();
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });

    const mutationObserver = new MutationObserver(updateScrollProgress);
    mutationObserver.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      mutationObserver.disconnect();
      scrollElRef.current = null;
    };
  }, [editor, updateScrollProgress]);

  const epsilon = 0.02;
  const hasOverflow = scrollProgress < 1 - epsilon || scrollProgress > epsilon;
  let showTopFade = false;
  let showBottomFade = false;

  if (hasOverflow) {
    if (scrollProgress <= epsilon) {
      showBottomFade = true;
    } else if (scrollProgress >= 1 - epsilon) {
      showTopFade = true;
    } else {
      showTopFade = scrollDirection === "down";
      showBottomFade = scrollDirection === "up";
    }
  }

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "from-bg-default pointer-events-none absolute inset-x-0 top-0 z-[1] h-[20px] bg-gradient-to-b to-transparent transition-opacity duration-150 ease-out",
          showTopFade ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "from-bg-default pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[20px] bg-gradient-to-t to-transparent transition-opacity duration-150 ease-out",
          showBottomFade ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

function MessageInputToolbar({
  emojiPickerOpen,
  setEmojiPickerOpen,
  stripColonOnEmojiPickRef,
  cursorRect,
}: {
  emojiPickerOpen: boolean;
  setEmojiPickerOpen: (open: boolean) => void;
  stripColonOnEmojiPickRef: { current: boolean };
  cursorRect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null;
}) {
  const { editor } = useRichTextContext();

  return (
    <RichTextToolbar
      toolsStart={
        <EmojiPicker
          openPopover={emojiPickerOpen}
          setOpenPopover={setEmojiPickerOpen}
          onKeyboardDismissFocusEditor={() => editor?.commands.focus()}
          anchorRect={cursorRect}
          onSelect={(emoji) => {
            if (!editor) return;
            const stripColon = stripColonOnEmojiPickRef.current;
            stripColonOnEmojiPickRef.current = false;

            const { from } = editor.state.selection;
            if (
              stripColon &&
              from > 0 &&
              editor.state.doc.textBetween(from - 1, from) === ":"
            ) {
              editor
                .chain()
                .deleteRange({ from: from - 1, to: from })
                .insertContent(emoji)
                .run();
            } else {
              editor.chain().insertContent(emoji).run();
            }
            setTimeout(() => editor.commands.focus(), 0);
          }}
        >
          <RichTextToolbarButton icon={FaceSmile} label="Emoji" />
        </EmojiPicker>
      }
    />
  );
}
