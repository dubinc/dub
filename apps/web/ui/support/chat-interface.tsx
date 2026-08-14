"use client";

import { GlobalChatContext } from "@/lib/ai/build-system-prompt";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { useChat } from "@ai-sdk/react";
import { Combobox } from "@dub/ui";
import { OfficeBuilding, PaperPlane, Users2, Xmark } from "@dub/ui/icons";
import { cn, fetcher, OG_AVATAR_URL } from "@dub/utils";
import { DefaultChatTransport, isFileUIPart } from "ai";
import { Paperclip } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import useSWR from "swr";
import { MarkdownCodeBlock } from "./code-block";
import {
  compressChatImage,
  isChatImageFile,
  MAX_CHAT_IMAGES,
} from "./compress-chat-image";
import { SupportMessage } from "./message";
import { ProgramCombobox, ProgramSummary } from "./program-combobox";
import { extractSources, SourceCitations } from "./source-citations";
import { StarterQuestions } from "./starter-questions";
import { StatusIndicator } from "./status-indicator";
import { TicketUpload } from "./ticket-upload";
import { WorkspaceCombobox, WorkspaceSummary } from "./workspace-combobox";

type AccountType = "workspace" | "partner";

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export function ChatInterface({
  className,
  embedded,
  onReset,
}: {
  className?: string;
  embedded?: boolean;
  onReset?: () => void;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [selection, setSelection] = useState<GlobalChatContext>({});

  const storageKey = session?.user?.["id"]
    ? `dub-support-chat:${session.user["id"]}`
    : null;
  const restoredRef = useRef(false);

  const effectiveAccountType = selection.accountType;

  const { data: workspaces } = useSWR<WorkspaceSummary[]>(
    effectiveAccountType === "workspace" ? "/api/workspaces" : null,
    fetcher,
  );

  const { programEnrollments, isLoading: isLoadingPrograms } =
    useProgramEnrollments();
  const hasPartnerProfile = !!session?.user?.["defaultPartnerId"];
  const hasNoProgramEnrollments =
    hasPartnerProfile &&
    !isLoadingPrograms &&
    (programEnrollments?.length ?? 0) === 0;

  let canChat: boolean;
  if (effectiveAccountType === "workspace")
    canChat = !!selection.selectedWorkspace;
  else if (effectiveAccountType === "partner")
    canChat = hasNoProgramEnrollments || !!selection.selectedProgram;
  else canChat = false;

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/support-chat",
    }),
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  useEffect(() => {
    if (embedded) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, status, embedded]);

  useEffect(() => {
    if (status === "ready") {
      textareaRef.current?.focus();
    }
  }, [status]);

  useEffect(() => {
    if (!storageKey || restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const stored = JSON.parse(raw);
      if (stored.selection) setSelection(stored.selection);
      if (stored.messages?.length) setMessages(stored.messages);
      if (stored.ticketSubmitted) setTicketSubmitted(true);
    } catch {}
  }, [storageKey, setMessages]);

  useEffect(() => {
    if (!storageKey || !restoredRef.current) return;

    try {
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...stored, selection }),
      );
    } catch {}
  }, [selection, storageKey]);

  useEffect(() => {
    if (!storageKey || !restoredRef.current || status === "streaming") return;

    try {
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...stored,
          messages: messages.map((message) => ({
            ...message,
            parts: message.parts?.map((part) =>
              part.type === "file" ? { ...part, url: "" } : part,
            ),
          })),
          ticketSubmitted,
        }),
      );
    } catch {}
  }, [messages, ticketSubmitted, status, storageKey]);

  const clearPersistedSession = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  };

  pendingImagesRef.current = pendingImages;

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      );
    };
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    const supported = incoming.filter(isChatImageFile);
    const rejected = incoming.length - supported.length;

    if (rejected > 0) {
      toast.error("Please attach a PNG, JPEG, or WebP image.");
    }

    if (supported.length === 0) return;

    setPendingImages((prev) => {
      const remaining = MAX_CHAT_IMAGES - prev.length;
      if (remaining <= 0) {
        toast.error(`You can attach up to ${MAX_CHAT_IMAGES} images.`);
        return prev;
      }

      const next = supported.slice(0, remaining).map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      if (supported.length > remaining) {
        toast.error(`You can attach up to ${MAX_CHAT_IMAGES} images.`);
      }

      return [...prev, ...next];
    });
  }, []);

  const getSlackThreadTs = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const meta = (messages[i] as any).metadata as
        | { slackThreadTs?: string }
        | undefined;
      if (meta?.slackThreadTs) return meta.slackThreadTs;
    }
    return undefined;
  };

  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    const imagesToSend = pendingImages;
    if (
      (!messageText && imagesToSend.length === 0) ||
      status === "streaming" ||
      status === "submitted" ||
      isCompressing ||
      !canChat
    ) {
      return;
    }

    const requestBody = {
      globalContext: {
        ...selection,
        chatLocation: effectiveAccountType === "partner" ? "partners" : "app",
        accountType: effectiveAccountType,
      },
      slackThreadTs: getSlackThreadTs(),
    };

    if (imagesToSend.length === 0) {
      sendMessage({ text: messageText }, { body: requestBody });
      setInput("");
      textareaRef.current?.focus();
      return;
    }

    setIsCompressing(true);
    try {
      const files = await Promise.all(
        imagesToSend.map(async (image) => {
          const compressed = await compressChatImage(image.file);
          return {
            type: "file" as const,
            filename: compressed.filename,
            mediaType: compressed.mediaType,
            url: compressed.dataUrl,
          };
        }),
      );

      if (messageText) {
        sendMessage({ text: messageText, files }, { body: requestBody });
      } else {
        sendMessage({ files }, { body: requestBody });
      }

      imagesToSend.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setPendingImages([]);
      setInput("");
      textareaRef.current?.focus();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not process image. Try a different PNG or JPEG.",
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleEscalateViaForm = (
    attachmentIds: string[] = [],
    details: string = "",
  ) => {
    sendMessage(
      { text: "Please create my support ticket now." },
      {
        body: {
          globalContext: {
            ...selection,
            chatLocation:
              effectiveAccountType === "partner" ? "partners" : "app",
            accountType: effectiveAccountType,
          },
          slackThreadTs: getSlackThreadTs(),
          ...(attachmentIds.length ? { attachmentIds } : {}),
          ...(details ? { ticketDetails: details } : {}),
        },
      },
    );
    setTicketSubmitted(true);
  };

  const handleAccountTypeChange = (type: AccountType) => {
    setSelection({ accountType: type });
    setMessages([]);
  };

  const handleWorkspaceSelect = (ws: WorkspaceSummary) => {
    if (selection.selectedWorkspace?.slug !== ws.slug) setMessages([]);
    setSelection((s) => ({
      ...s,
      selectedWorkspace: { id: ws.id, slug: ws.slug, name: ws.name },
    }));
  };

  const handleProgramSelect = (program: ProgramSummary) => {
    if (selection.selectedProgram?.slug !== program.slug) setMessages([]);
    setSelection((s) => ({
      ...s,
      selectedProgram: {
        id: program.id,
        slug: program.slug,
        name: program.name,
      },
    }));
  };

  const accountTypeOptions = [
    {
      value: "workspace",
      label: "Workspace (app.dub.co)",
      icon: <OfficeBuilding className="size-3.5 shrink-0" />,
    },
    {
      value: "partner",
      label: "Partner (partners.dub.co)",
      icon: <Users2 className="size-3.5 shrink-0" />,
    },
  ];

  const requiresAuth = true;
  const isLoadingSession = requiresAuth && sessionStatus === "loading";
  const isUnauthenticated = requiresAuth && sessionStatus === "unauthenticated";

  const userAvatar =
    session?.user?.image || `${OG_AVATAR_URL}${session?.user?.email}`;
  const assistantAvatar = embedded
    ? "https://assets.dub.co/misc/dub-avatar.svg"
    : undefined;
  const showStarterQuestions = canChat && messages.length === 0;
  const hasRequestedTicket = messages.some((m) =>
    m.parts?.some((p: any) => p.type === "tool-requestSupportTicket"),
  );
  const canEscalate =
    canChat &&
    messages.length >= 2 &&
    status === "ready" &&
    !ticketSubmitted &&
    !hasRequestedTicket;

  if (isLoadingSession) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-3 p-6",
          className,
        )}
      >
        <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-3 w-32 animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  if (isUnauthenticated) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-4 p-8 text-center",
          className,
        )}
      >
        <img
          src="https://assets.dub.co/misc/dub-avatar.svg"
          alt="Dub Support"
          className="size-12 rounded-full"
          draggable={false}
        />
        <div>
          <p className="text-sm font-medium text-neutral-800">
            Please log in to chat with Dub support
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            You need a Dub account to access support.
          </p>
        </div>
        <a
          href="https://app.dub.co/login"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Log in to Dub ↗
        </a>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex flex-1 flex-col gap-6 p-4",
          embedded ? "overflow-visible" : "overflow-y-auto",
        )}
      >
        <SupportMessage avatar={assistantAvatar} animate={false}>
          <p className="text-sm text-neutral-700">
            Hi there! I'm Dub's AI support assistant. Which account would you
            like help with today?
          </p>
          <div className="mt-3 w-full max-w-72">
            <Combobox
              forceDropdown
              selected={
                accountTypeOptions.find(
                  (o) => o.value === effectiveAccountType,
                ) ?? null
              }
              setSelected={(opt) => {
                if (opt && opt.value !== effectiveAccountType)
                  handleAccountTypeChange(opt.value as AccountType);
              }}
              options={accountTypeOptions}
              icon={
                accountTypeOptions.find((o) => o.value === effectiveAccountType)
                  ?.icon
              }
              caret
              placeholder="Select account type"
              hideSearch
              matchTriggerWidth
              popoverProps={{
                contentClassName: "w-[var(--radix-popover-trigger-width)]",
              }}
              buttonProps={{
                className: cn(
                  "w-full max-w-72 justify-start border-neutral-300 px-2.5 h-9 text-sm",
                  "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                  "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
                ),
              }}
              labelProps={{ className: "text-sm text-neutral-600" }}
              optionClassName="h-8"
            />
          </div>
        </SupportMessage>

        {effectiveAccountType === "workspace" && (
          <SupportMessage avatar={assistantAvatar} animate>
            <p className="text-sm text-neutral-700">
              Which workspace is this about?
            </p>
            <div className="mt-3 w-full max-w-72">
              <WorkspaceCombobox
                workspaces={workspaces}
                selectedSlug={selection.selectedWorkspace?.slug}
                onSelect={handleWorkspaceSelect}
              />
            </div>
          </SupportMessage>
        )}

        {effectiveAccountType === "partner" && !hasNoProgramEnrollments && (
          <SupportMessage avatar={assistantAvatar} animate>
            {!hasPartnerProfile ? (
              <>
                <p className="text-sm text-neutral-700">
                  It looks like you don't have a partner account linked to your
                  profile.
                </p>
                <a
                  href="https://partners.dub.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
                >
                  Go to partners.dub.co ↗
                </a>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-700">
                  Which program is this about?
                </p>
                <div className="mt-3 w-full max-w-72">
                  <ProgramCombobox
                    enrollments={programEnrollments}
                    isLoading={isLoadingPrograms}
                    selectedSlug={selection.selectedProgram?.slug}
                    onSelect={handleProgramSelect}
                  />
                </div>
              </>
            )}
          </SupportMessage>
        )}

        {showStarterQuestions && (
          <SupportMessage avatar={assistantAvatar} animate>
            <p className="text-sm text-neutral-700">
              How can I help you today?
            </p>
            {effectiveAccountType !== "partner" && (
              <StarterQuestions
                context="app"
                onSelect={handleSend}
                className="mt-3"
              />
            )}
          </SupportMessage>
        )}

        {canChat &&
          messages.map((message, index) => {
            const isUser = message.role === "user";

            if (isUser) {
              const textContent = message.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("\n\n")
                .trim();
              const fileParts = message.parts.filter(isFileUIPart);
              if (!textContent && fileParts.length === 0) return null;
              return (
                <SupportMessage
                  key={message.id}
                  avatar={userAvatar}
                  isUser
                  animate
                  media={
                    fileParts.length > 0 ? (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {fileParts.map((part, partIndex) =>
                          part.url ? (
                            <img
                              key={partIndex}
                              src={part.url}
                              alt={part.filename ?? "Attached image"}
                              className="max-h-32 max-w-[200px] rounded-lg object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div
                              key={partIndex}
                              className="rounded-lg bg-neutral-200 px-2 py-1 text-xs text-neutral-500"
                            >
                              Image attached
                            </div>
                          ),
                        )}
                      </div>
                    ) : undefined
                  }
                >
                  {textContent ? (
                    <p className="text-sm">{textContent}</p>
                  ) : null}
                </SupportMessage>
              );
            }

            // --- Assistant message ---
            const isCurrentlyStreaming =
              status === "streaming" && index === messages.length - 1;
            const sources = !isCurrentlyStreaming
              ? extractSources(
                  message.parts as { type: string; [key: string]: unknown }[],
                )
              : [];

            const hasTextPart = message.parts?.some(
              (p: any) => p.type === "text" && p.text,
            );
            const hasTicketForm = message.parts?.some(
              (p: any) =>
                p.type === "tool-requestSupportTicket" &&
                p.state === "output-available",
            );
            const hasVisibleContent = hasTextPart || hasTicketForm;

            if (!hasVisibleContent && !message.parts?.length) return null;

            return (
              <SupportMessage key={message.id} avatar={assistantAvatar} animate>
                {!hasVisibleContent ? (
                  (() => {
                    const isCreatingTicket = message.parts?.some(
                      (p: any) =>
                        p.type === "tool-createSupportTicket" &&
                        p.state === "input-available",
                    );
                    const isSearching = message.parts?.some(
                      (p: any) =>
                        p.type === "tool-findRelevantDocs" &&
                        p.state !== "output-available",
                    );
                    return (
                      <StatusIndicator
                        label={
                          isCreatingTicket
                            ? "Creating your ticket..."
                            : isSearching
                              ? "Searching docs..."
                              : "Thinking..."
                        }
                        className="py-0.5"
                      />
                    );
                  })()
                ) : (
                  <div className="flex flex-col gap-3">
                    {message.parts?.map((part: any, partIndex: number) => {
                      if (part.type === "text" && part.text) {
                        return (
                          <Streamdown
                            key={partIndex}
                            isAnimating={isCurrentlyStreaming}
                            className="text-content-emphasis"
                            controls={false}
                            components={{
                              h1: () => null,
                              h2: () => null,
                              h3: () => null,
                              h4: () => null,
                              h5: () => null,
                              h6: () => null,
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-help font-medium text-neutral-900 underline decoration-dotted underline-offset-2 hover:text-neutral-600"
                                >
                                  {children}
                                </a>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-outside list-disc pl-6">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-outside list-decimal pl-6">
                                  {children}
                                </ol>
                              ),
                              code: MarkdownCodeBlock,
                            }}
                          >
                            {part.text}
                          </Streamdown>
                        );
                      }

                      if (
                        part.type === "tool-requestSupportTicket" &&
                        part.state === "output-available"
                      ) {
                        return (
                          <div
                            key={partIndex}
                            className="rounded-xl border border-neutral-200 pt-3"
                          >
                            <TicketUpload
                              onSubmit={(ids, details) =>
                                handleEscalateViaForm(ids, details)
                              }
                              submitted={ticketSubmitted}
                            />
                          </div>
                        );
                      }

                      return null;
                    })}
                    <SourceCitations sources={sources} />
                  </div>
                )}
              </SupportMessage>
            );
          })}

        {status === "submitted" && (
          <SupportMessage avatar={assistantAvatar}>
            <StatusIndicator label="Thinking..." className="py-0.5" />
          </SupportMessage>
        )}
        <div />
      </div>

      {ticketSubmitted ? (
        <div className="shrink-0 border-t border-neutral-100 bg-neutral-50 px-4 py-4 text-center">
          <p className="text-sm font-medium text-neutral-700">
            Your ticket has been submitted.
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            To ask more questions, please start a new session.
          </p>
          <button
            type="button"
            onClick={() => {
              clearPersistedSession();
              (onReset ?? (() => window.location.reload()))();
            }}
            className="mt-3 rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Start new session
          </button>
        </div>
      ) : hasRequestedTicket ? null : (
        <div
          className="shrink-0 border-t border-neutral-100 bg-white p-3"
          onDragOver={(e) => {
            if (!canChat) return;
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!canChat) return;
            addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          {pendingImages.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingImages.map((image) => (
                <div key={image.id} className="relative size-16 shrink-0">
                  <img
                    src={image.previewUrl}
                    alt={image.file.name}
                    className="size-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPendingImages((prev) => {
                        const entry = prev.find((item) => item.id === image.id);
                        if (entry) URL.revokeObjectURL(entry.previewUrl);
                        return prev.filter((item) => item.id !== image.id);
                      });
                    }}
                    aria-label="Remove image"
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-700"
                  >
                    <Xmark className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div
            className={cn(
              "relative rounded-xl",
              isDragging && "ring-2 ring-neutral-400",
            )}
          >
            <TextareaAutosize
              ref={textareaRef}
              minRows={3}
              maxRows={6}
              placeholder={
                !canChat
                  ? "Select an account above to start chatting..."
                  : effectiveAccountType === "partner"
                    ? "Ask about payouts, referrals, or commissions..."
                    : "Ask about links, analytics, or your account..."
              }
              value={input}
              disabled={
                !canChat ||
                status === "streaming" ||
                status === "submitted" ||
                isCompressing
              }
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                const fromFiles = Array.from(
                  e.clipboardData?.files ?? [],
                ).filter(isChatImageFile);
                const fromItems =
                  fromFiles.length > 0
                    ? []
                    : Array.from(e.clipboardData?.items ?? [])
                        .filter((item) => item.kind === "file")
                        .map((item) => item.getAsFile())
                        .filter(
                          (file): file is File =>
                            !!file && isChatImageFile(file),
                        );
                const imageFiles = fromFiles.length > 0 ? fromFiles : fromItems;
                if (imageFiles.length === 0) return;
                e.preventDefault();
                addFiles(imageFiles);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className={cn(
                "w-full resize-none rounded-xl border border-neutral-200 py-2.5 pl-3 pr-24 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors",
                "focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-60",
              )}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                !canChat ||
                status === "streaming" ||
                status === "submitted" ||
                isCompressing ||
                pendingImages.length >= MAX_CHAT_IMAGES
              }
              className={cn(
                "absolute bottom-4 right-12 flex size-8 items-center justify-center rounded-full transition-all",
                canChat &&
                  status === "ready" &&
                  !isCompressing &&
                  pendingImages.length < MAX_CHAT_IMAGES
                  ? "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  : "cursor-not-allowed text-neutral-300",
              )}
              aria-label="Attach image"
            >
              <Paperclip className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={
                !canChat ||
                status === "streaming" ||
                status === "submitted" ||
                isCompressing ||
                (!input.trim() && pendingImages.length === 0)
              }
              className={cn(
                "absolute bottom-4 right-3 flex size-8 items-center justify-center rounded-full transition-all",
                canChat &&
                  status === "ready" &&
                  !isCompressing &&
                  (input.trim() || pendingImages.length > 0)
                  ? "bg-neutral-900 text-white hover:bg-neutral-700"
                  : "cursor-not-allowed bg-neutral-200 text-neutral-400",
              )}
              aria-label="Send message"
            >
              <PaperPlane className="size-4" />
            </button>
          </div>

          <div className="mt-px flex flex-col items-center gap-1">
            <p className="text-center text-xs text-neutral-400">
              AI may make mistakes. Verify important information.
            </p>
            {canEscalate && (
              <button
                type="button"
                onClick={() =>
                  handleSend(
                    "I'd like to create a support ticket and speak with a human agent.",
                  )
                }
                className="text-xs font-medium text-neutral-500 underline decoration-dotted underline-offset-2 hover:text-neutral-700"
              >
                Convert to support ticket →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
