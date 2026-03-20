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
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const stripColonOnEmojiPickRef = useRef(false);

  const setEmojiPickerOpen = useCallback((open: boolean) => {
    stripColonOnEmojiPickRef.current = false;
    setEmojiPickerOpenState(open);
  }, []);

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
        <RichTextArea />

        <div className="flex items-center justify-between gap-4 px-3 pb-3">
          <MessageInputToolbar
            emojiPickerOpen={emojiPickerOpen}
            setEmojiPickerOpen={setEmojiPickerOpen}
            stripColonOnEmojiPickRef={stripColonOnEmojiPickRef}
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
                    <span className="flex size-4 items-center justify-center rounded border border-neutral-700 text-[0.625rem]">
                      {navigator.platform.startsWith("Mac") ? "⌘" : "^"}
                    </span>
                    <span className="flex size-4 items-center justify-center rounded border border-neutral-700">
                      <ArrowTurnLeft className="text-content-inverted size-2.5" />
                    </span>
                  </span>
                </span>
              }
              disabled={typedMessage.trim().length >= MAX_MESSAGE_LENGTH}
              onClick={sendMessage}
              className="h-8 w-fit rounded-lg px-4"
            />
          </div>
        </div>
      </RichTextProvider>
    </div>
  );
}

function MessageInputToolbar({
  emojiPickerOpen,
  setEmojiPickerOpen,
  stripColonOnEmojiPickRef,
}: {
  emojiPickerOpen: boolean;
  setEmojiPickerOpen: (open: boolean) => void;
  stripColonOnEmojiPickRef: { current: boolean };
}) {
  const { editor } = useRichTextContext();
  const prevEmojiPickerOpen = useRef(emojiPickerOpen);

  useEffect(() => {
    if (prevEmojiPickerOpen.current && !emojiPickerOpen && editor) {
      setTimeout(() => editor.commands.focus(), 0);
    }
    prevEmojiPickerOpen.current = emojiPickerOpen;
  }, [emojiPickerOpen, editor]);

  return (
    <RichTextToolbar
      toolsStart={
        <EmojiPicker
          openPopover={emojiPickerOpen}
          setOpenPopover={setEmojiPickerOpen}
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
