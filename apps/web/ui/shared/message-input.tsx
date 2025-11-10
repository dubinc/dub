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
import { useRef, useState } from "react";
import { EmojiPicker } from "../shared/emoji-picker";

export function MessageInput({
  onSendMessage,
  defaultValue = "",
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
  const [typedMessage, setTypedMessage] = useState(defaultValue);

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
        editorClassName="block max-h-24 w-full resize-none border-none overflow-auto scrollbar-hide p-3 text-base sm:text-sm"
        onChange={(editor) => setTypedMessage((editor as any).getMarkdown())}
        editorProps={{
          handleDOMEvents: {
            keydown: (_, e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
                return false;
              }
            },
          },
        }}
      >
        <RichTextArea />

        <div className="flex items-center justify-between gap-4 px-3 pb-3">
          <MessageInputToolbar />
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

function MessageInputToolbar() {
  const { editor } = useRichTextContext();

  return (
    <RichTextToolbar
      toolsStart={
        <EmojiPicker
          onSelect={(emoji) => {
            if (!editor) return;
            editor.chain().focus().insertContent(emoji).run();
          }}
        >
          <RichTextToolbarButton icon={FaceSmile} label="Emoji" />
        </EmojiPicker>
      }
    />
  );
}
