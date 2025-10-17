import { Message, PartnerProps, ProgramProps } from "@/lib/types";
import {
  AnimatedSizeContainer,
  Check2,
  Envelope,
  LoadingSpinner,
  Tooltip,
  useMediaQuery,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, formatDate } from "@dub/utils";
import Linkify from "linkify-react";
import { ChevronRight } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import { MessageInput } from "../shared/message-input";
import { MessageMarkdown } from "./message-markdown";

interface Sender {
  name: string | null;
  image?: string | null;
  partnerId?: string;
  userId?: string;
}

export function MessagesPanel({
  messages,
  currentUserType,
  currentUserId,
  program,
  partner,
  onSendMessage,
  placeholder,
  error,
}: {
  messages?: (Message & { delivered?: boolean })[];
  currentUserType: "partner" | "user";
  currentUserId: string;
  program?: Pick<ProgramProps, "logo" | "name">;
  partner?: Pick<PartnerProps, "name">;
  onSendMessage: (message: string) => void;
  placeholder?: string;
  error?: any;
}) {
  const { isMobile } = useMediaQuery();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate personalized placeholder based on user type
  const personalizedPlaceholder = useMemo(
    () =>
      placeholder ||
      (currentUserType === "partner" && program?.name
        ? `Message ${program.name}...`
        : currentUserType === "user" && partner?.name
          ? `Message ${partner.name}...`
          : "Type a message..."),
    [placeholder, currentUserType, program?.name, partner?.name],
  );

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

                  {message.type === "campaign" ? (
                    <CampaignMessage
                      message={message}
                      isMySide={isMySide}
                      isMe={isMe}
                      sender={sender}
                      showStatusIndicator={showStatusIndicator}
                      isNewTime={isNewTime}
                      isNew={isNew}
                      program={program}
                    />
                  ) : (
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
                      <MessageAvatar
                        sender={sender}
                        program={program}
                        message={message}
                      />

                      <div
                        className={cn(
                          "flex flex-col items-start gap-1",
                          isMySide && "items-end",
                        )}
                      >
                        {/* Name / timestamp */}
                        <MessageHeader
                          isMySide={isMySide}
                          isMe={isMe}
                          sender={sender}
                          message={message}
                          isNewTime={isNewTime}
                          showStatusIndicator={showStatusIndicator}
                          program={program}
                        />
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
                  )}
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
          placeholder={personalizedPlaceholder}
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

function MessageAvatar({
  sender,
  program,
  message,
}: {
  sender: Sender | null;
  program?: Pick<ProgramProps, "logo" | "name"> | null;
  message: Message;
}) {
  const isCampaign = message.type === "campaign";
  const avatarName = !isCampaign ? sender?.name : program?.name;
  const avatarImage = !isCampaign ? sender?.image : program?.logo;

  return (
    <Tooltip content={avatarName}>
      <div className="relative shrink-0">
        <img
          src={avatarImage ?? `${OG_AVATAR_URL}${avatarName}`}
          alt={`${avatarName} avatar`}
          className="size-8 rounded-full"
          draggable={false}
        />

        {!isCampaign && program?.logo && !message.senderPartnerId && (
          <img
            src={program?.logo}
            alt="program logo"
            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border border-white"
          />
        )}
      </div>
    </Tooltip>
  );
}

function MessageHeader({
  isMySide,
  isMe,
  sender,
  message,
  isNewTime,
  showStatusIndicator,
  program,
}: {
  isMySide: boolean;
  isMe: boolean;
  sender: Sender | null;
  message: Message & { delivered?: boolean };
  isNewTime: boolean;
  showStatusIndicator: boolean;
  program?: Pick<ProgramProps, "logo" | "name"> | null;
}) {
  const isCampaign = message.type === "campaign";
  const name = isCampaign ? program?.name : sender?.name;

  return (
    (!isMySide || isNewTime || showStatusIndicator) && (
      <div className="flex items-center gap-1.5">
        {!isMe && (
          <>
            <span className="text-content-default min-w-0 truncate text-xs font-medium">
              {name}
            </span>

            {isCampaign && (
              <>
                <span className="text-content-default text-xs font-medium">
                  •
                </span>
                <span className="text-content-default text-xs font-medium">
                  Email sent
                </span>
              </>
            )}
          </>
        )}

        {isNewTime && (
          <span className="text-content-subtle text-xs font-medium">
            {new Date(message.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "numeric",
            })}
          </span>
        )}
        {showStatusIndicator && <StatusIndicator message={message} />}
      </div>
    )
  );
}

function CampaignMessage({
  message,
  isMySide,
  isMe,
  sender,
  showStatusIndicator,
  isNewTime,
  isNew,
  program,
}: {
  message: Message & { delivered?: boolean };
  isMySide: boolean;
  isMe: boolean;
  sender: Sender | null;
  showStatusIndicator: boolean;
  isNewTime: boolean;
  isNew: boolean;
  program?: Pick<ProgramProps, "logo" | "name"> | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isMySide
          ? "origin-bottom-right flex-row-reverse"
          : "origin-bottom-left",
        isNew && "animate-scale-in-fade",
      )}
    >
      <MessageAvatar sender={sender} program={program} message={message} />

      <div
        className={cn(
          "flex flex-col items-start gap-1",
          isMySide && "items-end",
        )}
      >
        <MessageHeader
          isMySide={isMySide}
          isMe={isMe}
          sender={sender}
          message={message}
          isNewTime={isNewTime}
          showStatusIndicator={showStatusIndicator}
          program={program}
        />

        <div
          className={cn(
            "max-w-lg rounded-xl text-sm",
            isMySide
              ? "text-content-inverted rounded-br bg-neutral-700"
              : "text-content-default rounded-bl bg-neutral-100",
          )}
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-t-xl px-4 py-2.5 pb-2",
              !isExpanded && "rounded-b-xl",
              isExpanded && "border-b border-neutral-200",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Envelope
                className={cn(
                  "text-content-default size-4 shrink-0",
                  isMySide && "text-content-inverted",
                )}
              />
              <span
                className={cn(
                  "text-content-default truncate text-sm font-medium",
                  isMySide && "text-content-inverted",
                )}
              >
                {message.subject}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1 text-xs font-semibold">
              <p>{isExpanded ? "Hide" : "Show"} email</p>
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  isExpanded && "rotate-90",
                )}
              />
            </div>
          </button>

          <AnimatedSizeContainer height>
            <div
              className={cn(
                "max-w-lg overflow-hidden",
                isExpanded ? "px-2 py-2.5" : "max-h-0 px-2 py-0",
              )}
            >
              <MessageMarkdown invert={isMySide}>
                {message.text}
              </MessageMarkdown>
            </div>
          </AnimatedSizeContainer>
        </div>
      </div>
    </div>
  );
}
