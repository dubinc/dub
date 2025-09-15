import { MAX_MESSAGE_LENGTH } from "@/lib/zod/schemas/messages";
import { ArrowTurnLeft, Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRef, useState } from "react";
import ReactTextareaAutosize from "react-textarea-autosize";
import { EmojiPicker } from "../shared/emoji-picker";

export function MessageInput({
  onSendMessage,
  autoFocus,
  placeholder = "Type a message...",
  sendButtonText = "Send",
  className,
}: {
  onSendMessage: (message: string) => void | false;
  autoFocus?: boolean;
  placeholder?: string;
  sendButtonText?: string;
  className?: string;
}) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const selectionStartRef = useRef<number | null>(null);
  const [typedMessage, setTypedMessage] = useState("");

  const sendMessage = () => {
    const message = typedMessage.trim();
    if (!message) return;

    if (onSendMessage(message) !== false) setTypedMessage("");
  };

  return (
    <div
      className={cn(
        "border-border-subtle overflow-hidden rounded-xl border has-[textarea:focus]:border-neutral-500 has-[textarea:focus]:ring-1 has-[textarea:focus]:ring-neutral-500",
        className,
      )}
    >
      <ReactTextareaAutosize
        ref={textAreaRef}
        autoFocus={autoFocus}
        className="placeholder:text-content-subtle block max-h-24 w-full resize-none border-none p-3 text-base focus:ring-0 sm:text-sm"
        placeholder={placeholder}
        value={typedMessage}
        maxLength={MAX_MESSAGE_LENGTH}
        onChange={(e) => setTypedMessage(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            sendMessage();
          }
        }}
        onBlur={(e) => (selectionStartRef.current = e.target.selectionStart)}
      />

      <div className="flex items-center justify-between gap-4 px-3 pb-3">
        <div className="flex items-center gap-2">
          <EmojiPicker
            onSelect={(emoji) => {
              const pos = selectionStartRef.current;
              setTypedMessage((prev) =>
                pos !== null
                  ? prev.slice(0, pos) + emoji + prev.slice(pos)
                  : prev + emoji,
              );
              textAreaRef.current?.focus();
            }}
          />
        </div>
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
          onClick={sendMessage}
          className="h-8 w-fit rounded-lg px-4"
        />
      </div>
    </div>
  );
}
