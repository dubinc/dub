import { ArrowTurnLeft, Button } from "@dub/ui";
import { useRef, useState } from "react";
import ReactTextareaAutosize from "react-textarea-autosize";
import { EmojiPicker } from "./emoji-picker";

export function MessagesPanel({
  onSendMessage,
  placeholder = "Type a message...",
}: {
  onSendMessage: (message: string) => void;
  placeholder?: string;
}) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const selectionStartRef = useRef<number | null>(null);
  const [typedMessage, setTypedMessage] = useState("");

  const sendMessage = () => {
    if (!typedMessage) return;

    onSendMessage(typedMessage);
    setTypedMessage("");
  };

  return (
    <div className="flex size-full flex-col">
      <div className="grow">messages</div>
      <div className="border-border-subtle border-t p-3 sm:p-6">
        <div className="border-border-subtle overflow-hidden rounded-xl border has-[textarea:focus]:border-neutral-500 has-[textarea:focus]:ring-1 has-[textarea:focus]:ring-neutral-500">
          <ReactTextareaAutosize
            ref={textAreaRef}
            className="placeholder:text-content-subtle block max-h-24 w-full resize-none border-none p-3 text-base focus:ring-0 sm:text-sm"
            placeholder={placeholder}
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onBlur={(e) =>
              (selectionStartRef.current = e.target.selectionStart)
            }
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
                  Send
                  <span className="flex size-4 items-center justify-center rounded border border-neutral-700">
                    <ArrowTurnLeft className="text-content-inverted size-2.5" />
                  </span>
                </span>
              }
              onClick={sendMessage}
              className="h-8 w-fit rounded-lg px-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
