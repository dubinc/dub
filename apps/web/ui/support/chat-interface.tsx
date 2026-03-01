"use client";

import { SupportChatContext } from "./types";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { ProgramCombobox } from "./program-combobox";
import { WorkspaceCombobox, WorkspaceSummary } from "./workspace-combobox";
import { OfficeBuilding, PaperPlane, Users2 } from "@dub/ui/icons";
import { cn, fetcher, OG_AVATAR_URL } from "@dub/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import useSWR from "swr";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { SupportMessage } from "./message";
import { StarterQuestions } from "./starter-questions";

const WELCOME_MESSAGES: Record<SupportChatContext, string> = {
  app: "Hi there! I'm Dub's AI support assistant. Which account would you like help with today?",
  partners:
    "Hi there! I'm Dub's AI support assistant. Which account would you like help with today?",
  docs: "Hi there! I'm Dub's AI support assistant. I can help with SDK setup, API authentication, webhooks, conversion tracking, and more. What can I help you with today?",
};

type AccountType = "workspace" | "partner";

type SelectionState = {
  accountType?: AccountType;
  workspaceSlug?: string;
  workspaceName?: string;
  programSlug?: string;
  programName?: string;
};

// Minimal workspace shape from /api/workspaces
export function ChatInterface({
  context,
  className,
  embedded,
}: {
  context: SupportChatContext;
  className?: string;
  embedded?: boolean;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [selection, setSelection] = useState<SelectionState>({});

  const preselectedAccountType: AccountType | undefined =
    context === "app" ? "workspace" : context === "partners" ? "partner" : undefined;

  const effectiveAccountType = selection.accountType ?? preselectedAccountType;

  const { data: workspaces } = useSWR<WorkspaceSummary[]>(
    effectiveAccountType === "workspace" ? "/api/workspaces" : null,
    fetcher,
  );

  const { programEnrollments, isLoading: isLoadingPrograms } = useProgramEnrollments();
  const hasPartnerProfile = !!session?.user?.["defaultPartnerId"];

  const isDocsContext = context === "docs" || context === undefined;
  const requiresWorkspace =
    context === "app" || (isDocsContext && effectiveAccountType === "workspace");
  const requiresPartner =
    context === "partners" || (isDocsContext && effectiveAccountType === "partner");

  let canChat: boolean;
  if (requiresWorkspace) canChat = !!selection.workspaceSlug;
  else if (requiresPartner) canChat = !!selection.programSlug;
  else canChat = !isDocsContext;

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/support-chat",
      body: {
        context,
        accountType: effectiveAccountType,
        workspaceSlug: selection.workspaceSlug,
        programSlug: selection.programSlug,
      },
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

  const handleSend = (text?: string) => {
    const messageText = text ?? input;
    if (!messageText.trim() || status === "streaming" || !canChat) return;
    sendMessage({ text: messageText });
    setInput("");
  };

  const handleEscalate = () => {
    sendMessage({
      text: "I'd like to speak with a human support agent and create a support ticket.",
    });
    setTicketSubmitted(true);
  };

  const handleAccountTypeChange = (type: AccountType) => {
    setSelection({ accountType: type });
    setMessages([]);
  };

  const requiresAuth = true;
  const isLoadingSession = requiresAuth && sessionStatus === "loading";
  const isUnauthenticated = requiresAuth && sessionStatus === "unauthenticated";

  const userAvatar =
    session?.user?.image || `${OG_AVATAR_URL}${session?.user?.email}`;
  const showStarterQuestions = canChat && messages.length === 0;
  const canEscalate =
    canChat && messages.length >= 2 && status === "ready" && !ticketSubmitted;

  const ticketCreated = messages.some(
    (m) =>
      m.role === "assistant" &&
      m.parts?.some(
        (p) =>
          p.type === "tool-invocation" &&
          (p as any).toolName === "createSupportTicket" &&
          (p as any).state === "result" &&
          (p as any).result?.success === true,
      ),
  );

  if (isLoadingSession) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-3 p-6", className)}>
        <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-3 w-32 animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  if (isUnauthenticated) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-4 p-8 text-center", className)}>
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
          "flex-1 space-y-5 p-4",
          embedded ? "overflow-visible" : "overflow-y-auto",
        )}
      >
        <SupportMessage
          name="Dub Support"
          avatar="https://assets.dub.co/misc/dub-avatar.svg"
          animate={false}
        >
          <p className="text-sm text-neutral-700">{WELCOME_MESSAGES[context]}</p>

          {(context === "docs" || context === undefined) && !effectiveAccountType && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                {
                  type: "workspace" as AccountType,
                  label: "Dub workspace",
                  sublabel: "app.dub.co",
                  icon: <OfficeBuilding className="size-3.5" />,
                },
                {
                  type: "partner" as AccountType,
                  label: "Partner account",
                  sublabel: "partners.dub.co",
                  icon: <Users2 className="size-3.5" />,
                },
              ].map(({ type, label, sublabel, icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAccountTypeChange(type)}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-1.5 pl-2.5 pr-3 text-xs font-medium text-neutral-600 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-800"
                >
                  {icon}
                  <span>{label}</span>
                  <span className="text-neutral-400">· {sublabel}</span>
                </button>
              ))}
            </div>
          )}
        </SupportMessage>

        {effectiveAccountType === "workspace" && !selection.workspaceSlug && (
          <SupportMessage
            name="Dub Support"
            avatar="https://assets.dub.co/misc/dub-avatar.svg"
            animate
          >
            <p className="text-sm text-neutral-700">
              Which workspace is this about?
            </p>
            <div className="mt-3 w-full max-w-72">
              <WorkspaceCombobox
                workspaces={workspaces}
                selectedSlug={selection.workspaceSlug}
                onSelect={(ws) =>
                  setSelection((s) => ({
                    ...s,
                    workspaceSlug: ws.slug,
                    workspaceName: ws.name,
                  }))
                }
              />
            </div>
          </SupportMessage>
        )}

        {effectiveAccountType === "workspace" && selection.workspaceSlug && (
          <SupportMessage
            name="Dub Support"
            avatar="https://assets.dub.co/misc/dub-avatar.svg"
            animate
          >
            <p className="text-sm text-neutral-700">
              Got it —{" "}
              <span className="font-medium">{selection.workspaceName}</span>{" "}
              (Dub workspace). How can I help you today?
            </p>
            {showStarterQuestions && (
              <StarterQuestions
                context={context === "docs" ? "docs" : "app"}
                onSelect={handleSend}
                className="mt-3"
              />
            )}
          </SupportMessage>
        )}

        {effectiveAccountType === "partner" && !selection.programSlug && (
          <SupportMessage
            name="Dub Support"
            avatar="https://assets.dub.co/misc/dub-avatar.svg"
            animate
          >
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
                    selectedSlug={selection.programSlug}
                    onSelect={(program) =>
                      setSelection((s) => ({
                        ...s,
                        programSlug: program.slug,
                        programName: program.name,
                      }))
                    }
                  />
                </div>
              </>
            )}
          </SupportMessage>
        )}

        {effectiveAccountType === "partner" && selection.programSlug && (
          <SupportMessage
            name="Dub Support"
            avatar="https://assets.dub.co/misc/dub-avatar.svg"
            animate
          >
            <p className="text-sm text-neutral-700">
              Got it —{" "}
              <span className="font-medium">{selection.programName}</span>{" "}
              (Partner account). How can I help you today?
            </p>
            {showStarterQuestions && (
              <StarterQuestions
                context={context === "docs" ? "docs" : "partners"}
                onSelect={handleSend}
                className="mt-3"
              />
            )}
          </SupportMessage>
        )}

        {context === "docs" &&
          showStarterQuestions &&
          !selection.workspaceSlug &&
          !selection.programSlug && (
            <StarterQuestions
              context="docs"
              onSelect={handleSend}
              className="px-1"
            />
          )}

        {canChat &&
          messages.map((message) => {
            const isUser = message.role === "user";
            const textContent = message.parts
              .filter((p) => p.type === "text")
              .map((p) => (p as { type: "text"; text: string }).text)
              .join("");

            if (!textContent) return null;

            return (
              <SupportMessage
                key={message.id}
                name={isUser ? "You" : "Dub Support"}
                avatar={
                  isUser
                    ? userAvatar
                    : "https://assets.dub.co/misc/dub-avatar.svg"
                }
                isUser={isUser}
                animate
              >
                {isUser ? (
                  <p className="text-sm">{textContent}</p>
                ) : (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none text-neutral-800 prose-a:text-blue-600 prose-a:underline prose-a:underline-offset-2 prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4"
                    components={{
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 underline decoration-dotted underline-offset-2 hover:text-blue-800"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {textContent}
                  </ReactMarkdown>
                )}
              </SupportMessage>
            );
          })}

        {status === "submitted" && (
          <SupportMessage
            name="Dub Support"
            avatar="https://assets.dub.co/misc/dub-avatar.svg"
          >
            <div className="flex gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-neutral-400"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </SupportMessage>
        )}

        {ticketCreated && (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✓ Your support ticket has been created. Our team will get back to
            you shortly.
          </div>
        )}

        <div />
      </div>

      <div className="shrink-0 border-t border-neutral-100 bg-white p-3">
        <div className="relative">
          <TextareaAutosize
            minRows={2}
            maxRows={6}
            placeholder={
              !canChat
                ? "Select an account above to start chatting..."
                : effectiveAccountType === "partner"
                  ? "Ask about payouts, referrals, or commissions..."
                  : context === "docs"
                    ? "Ask about API, SDK, webhooks..."
                    : "Ask about links, analytics, or your account..."
            }
            value={input}
            disabled={!canChat || status === "streaming" || status === "submitted"}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-3 pr-[72px] text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-0 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={
              !canChat ||
              status === "streaming" ||
              status === "submitted" ||
              !input.trim()
            }
            className={cn(
              "absolute bottom-4 right-3 flex size-8 items-center justify-center rounded-full transition-all",
              canChat && input.trim() && status === "ready"
                ? "bg-neutral-900 text-white hover:bg-neutral-700"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed",
            )}
            aria-label="Send message"
          >
            <PaperPlane className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex flex-col items-center gap-1">
          <p className="text-center text-[11px] text-neutral-400">
            AI may make mistakes. Verify important information.
          </p>
          {canEscalate && (
            <button
              type="button"
              onClick={handleEscalate}
              className="text-[11px] font-medium text-neutral-500 underline decoration-dotted underline-offset-2 hover:text-neutral-700"
            >
              Talk to our team →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
