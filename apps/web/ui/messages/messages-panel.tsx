import { Message } from "@/lib/types";
import { MAX_MESSAGE_LENGTH } from "@/lib/zod/schemas/messages";
import {
  ArrowTurnLeft,
  Button,
  Check2,
  LoadingSpinner,
  Tooltip,
  useMediaQuery,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, formatDate } from "@dub/utils";
import Linkify from "linkify-react";
import { Fragment, useRef, useState } from "react";
import ReactTextareaAutosize from "react-textarea-autosize";
import { EmojiPicker } from "./emoji-picker";

export function MessagesPanel({
  messages,
  currentUserType,
  currentUserId,
  onSendMessage,
  placeholder = "Type a message...",
  error,
}: {
  messages?: (Message & { delivered?: boolean })[];
  currentUserType: "partner" | "user";
  currentUserId: string;
  onSendMessage: (message: string) => void;
  placeholder?: string;
  error?: any;
}) {
  const { isMobile } = useMediaQuery();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const selectionStartRef = useRef<number | null>(null);
  const [typedMessage, setTypedMessage] = useState("");

  const sendMessage = () => {
    if (!typedMessage.trim()) return;

    onSendMessage(typedMessage.trim());
    setTypedMessage("");
  };

  const isMessageFromCurrentUser = (message: Message) =>
    Boolean(
      currentUserType === "partner"
        ? message.senderPartner
        : message.senderUserId === currentUserId,
    );

  return (
    <div className="flex size-full flex-col">
      {messages ? (
        <div className="scrollbar-hide flex grow flex-col-reverse overflow-y-auto">
          <div className="flex flex-col items-stretch gap-5 p-6">
            {messages?.map((message, idx) => {
              const isNewDate =
                idx === 0 ||
                new Date(messages[idx - 1].createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();

              // If it's been more than 5 minutes since the last message
              const isNewTime =
                isNewDate ||
                new Date(message.createdAt).getTime() -
                  new Date(messages[idx - 1].createdAt).getTime() >
                  5 * 1000 * 60;

              const isCurrentUser = isMessageFromCurrentUser(message);

              // Message is new if it was sent within the last 5 seconds (used for intro animations)
              const isNew =
                new Date(message.createdAt).getTime() >
                new Date().getTime() - 5_000;

              const showStatusIndicator =
                isCurrentUser &&
                (idx === messages.length - 1 ||
                  messages
                    .slice(idx + 1)
                    .findIndex(isMessageFromCurrentUser) === -1);

              const sender = message.senderUser || message.senderPartner;

              return (
                <Fragment
                  key={`${new Date(message.createdAt).getTime()}-${message.senderUserId}-${message.senderPartnerId}`}
                >
                  {isNewDate && (
                    <div
                      className={cn(
                        "text-content-default text-center text-xs font-semibold",
                        isNew && "animate-scale-in-fade",
                      )}
                    >
                      {formatDate(message.createdAt)}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex items-end gap-2",
                      isCurrentUser
                        ? "origin-bottom-right flex-row-reverse"
                        : "origin-bottom-left",
                      isNew && "animate-scale-in-fade",
                    )}
                  >
                    {/* Avatar */}
                    <Tooltip content={sender?.name}>
                      <div className="relative shrink-0">
                        <img
                          src={
                            sender?.image || `${OG_AVATAR_URL}${sender?.name}`
                          }
                          alt={`${sender?.name} avatar`}
                          className="size-8 rounded-full"
                          draggable={false}
                        />
                        {/* {sender?.groupAvatar && (
                          <img
                            src={sender?.groupAvatar}
                            alt=""
                            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border border-white"
                          />
                        )} */}
                      </div>
                    </Tooltip>

                    <div
                      className={cn(
                        "flex flex-col gap-1",
                        isCurrentUser && "items-end",
                      )}
                    >
                      {/* Name / timestamp */}
                      {(!isCurrentUser || isNewTime || showStatusIndicator) && (
                        <div className="flex items-center gap-1.5">
                          {!isCurrentUser && (
                            <span className="text-content-default min-w-0 truncate text-xs font-medium">
                              {sender?.name}
                            </span>
                          )}
                          {isNewTime && (
                            <span className="text-content-subtle text-xs font-medium">
                              {new Date(message.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "numeric",
                                },
                              )}
                            </span>
                          )}
                          {showStatusIndicator && (
                            <StatusIndicator message={message} />
                          )}
                        </div>
                      )}
                      {/* Message box */}
                      <div
                        className={cn(
                          "max-w-lg whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm",
                          isCurrentUser
                            ? "text-content-inverted rounded-br bg-neutral-700"
                            : "text-content-default rounded-bl bg-neutral-100",
                        )}
                      >
                        <Linkify
                          as="p"
                          options={{
                            target: "_blank",
                            rel: "noopener noreferrer nofollow",
                            className: "underline underline-offset-4",
                          }}
                        >
                          {message.text}
                        </Linkify>
                      </div>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      ) : error ? (
        <div className="text-content-subtle flex size-full items-center justify-center text-sm font-medium">
          Failed to load messages
        </div>
      ) : (
        <div className="flex size-full items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
      <div className="border-border-subtle border-t p-3 sm:p-6">
        <div className="border-border-subtle overflow-hidden rounded-xl border has-[textarea:focus]:border-neutral-500 has-[textarea:focus]:ring-1 has-[textarea:focus]:ring-neutral-500">
          <ReactTextareaAutosize
            ref={textAreaRef}
            autoFocus={!isMobile}
            className="placeholder:text-content-subtle block max-h-24 w-full resize-none border-none p-3 text-base focus:ring-0 sm:text-sm"
            placeholder={placeholder}
            disabled={!messages}
            value={typedMessage}
            maxLength={MAX_MESSAGE_LENGTH}
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

function StatusIndicator({
  message,
}: {
  message: Message & { delivered?: boolean };
}) {
  return (
    <Tooltip
      content={
        message.delivered === false
          ? "Sending"
          : message.readInEmail
            ? "Read in email"
            : message.readInApp
              ? "Read in app"
              : "Delivered"
      }
    >
      <div
        className={cn(
          "text-content-subtle flex items-center",
          message.readInEmail && "text-violet-500",
          message.readInApp && "text-blue-500",
        )}
      >
        {message.delivered === false ? (
          <>
            <LoadingSpinner className="size-3" />
          </>
        ) : (
          <>
            <Check2 className="size-3" />
            {(message.readInEmail || message.readInApp) && (
              <Check2 className="-ml-0.5 size-3" />
            )}
          </>
        )}
      </div>
    </Tooltip>
  );
}
