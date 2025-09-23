import { Message } from "@/lib/types";
import { Check2, LoadingSpinner, Tooltip, useMediaQuery } from "@dub/ui";
import { OG_AVATAR_URL, cn, formatDate } from "@dub/utils";
import Linkify from "linkify-react";
import { Fragment, useRef } from "react";
import { MessageInput } from "../shared/message-input";

export function MessagesPanel({
  messages,
  currentUserType,
  currentUserId,
  programImage,
  onSendMessage,
  placeholder = "Type a message...",
  error,
}: {
  messages?: (Message & { delivered?: boolean })[];
  currentUserType: "partner" | "user";
  currentUserId: string;
  programImage?: string | null;
  onSendMessage: (message: string) => void;
  placeholder?: string;
  error?: any;
}) {
  const { isMobile } = useMediaQuery();
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = (message: string) => {
    if (!messages) return false;

    onSendMessage(message);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const isMessageMySide = (message: Message) =>
    Boolean(
      currentUserType === "partner"
        ? message.senderPartnerId
        : !message.senderPartnerId,
    );

  const isMessageFromMe = (message: Message) =>
    Boolean(
      currentUserType === "partner"
        ? message.senderPartnerId
        : message.senderUserId === currentUserId,
    );

  return (
    <div className="flex size-full flex-col">
      {messages ? (
        <div
          ref={scrollRef}
          className="scrollbar-hide flex grow flex-col-reverse overflow-y-auto"
        >
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

              const isMySide = isMessageMySide(message);
              const isMe = isMessageFromMe(message);

              // Message is new if it was sent within the last 10 seconds (used for intro animations)
              const isNew =
                new Date(message.createdAt).getTime() >
                new Date().getTime() - 10_000;

              // only show status indicator for program owners
              const showStatusIndicator =
                currentUserType === "user" &&
                isMySide &&
                (idx === messages.length - 1 ||
                  messages.slice(idx + 1).findIndex(isMessageMySide) === -1);

              const sender = message.senderPartner || message.senderUser;

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
                      isMySide
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
                        {programImage && !message.senderPartnerId && (
                          <img
                            src={programImage}
                            alt="program logo"
                            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border border-white"
                          />
                        )}
                      </div>
                    </Tooltip>

                    <div
                      className={cn(
                        "flex flex-col items-start gap-1",
                        isMySide && "items-end",
                      )}
                    >
                      {/* Name / timestamp */}
                      {(!isMySide || isNewTime || showStatusIndicator) && (
                        <div className="flex items-center gap-1.5">
                          {!isMe && (
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
                          isMySide
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
        <MessageInput
          placeholder={placeholder}
          onSendMessage={sendMessage}
          autoFocus={!isMobile}
        />
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
          : message.readInApp
            ? "Read in app"
            : message.readInEmail
              ? "Read in email"
              : "Delivered"
      }
    >
      <div
        className={cn(
          "text-content-subtle flex items-center",
          message.readInApp
            ? "text-blue-500"
            : message.readInEmail && "text-violet-500",
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
