"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { usePartnerMessages } from "@/lib/messages/hooks/use-partner-messages";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { NavButton } from "@/ui/layout/page-content/nav-button";
import { MessagesContext, MessagesPanel } from "@/ui/messages/messages-context";
import { MessagesList } from "@/ui/messages/messages-list";
import { PartnerSelector } from "@/ui/partners/partner-selector";
import { Button, InfoTooltip, LoadingSpinner } from "@dub/ui";
import { Msgs, Pen2 } from "@dub/ui/icons";
import { useParams, useRouter } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { MessagesUpsell } from "./messages-upsell";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const { plan } = useWorkspace();
  const { loading } = useProgram();

  if (loading) return <LayoutLoader />;

  const { canMessagePartners } = getPlanCapabilities(plan);
  if (!canMessagePartners) return <MessagesUpsell />;

  return <CapableLayout>{children}</CapableLayout>;
}

function CapableLayout({ children }: { children: ReactNode }) {
  const { slug: workspaceSlug, role } = useWorkspace();
  const { partnerId } = useParams() as { partnerId?: string };
  const { program } = useProgram();

  const permissionsError = clientAccessCheck({
    action: "messages.write",
    role,
    customPermissionDescription: "message partners",
  }).error;

  const router = useRouter();

  const { partnerMessages, isLoading, error } = usePartnerMessages({
    query: { messagesLimit: 1 },
  });

  const [currentPanel, setCurrentPanel] = useState<MessagesPanel>(
    partnerId ? "main" : "index",
  );
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);
  const [loadedThreadId, setLoadedThreadId] = useState<string | null>(null);
  const showThreadSpinner = Boolean(
    openingThreadId && openingThreadId !== loadedThreadId,
  );

  useEffect(() => {
    if (!partnerId) {
      setOpeningThreadId(null);
      setLoadedThreadId(null);
    }
  }, [partnerId]);

  return (
    <MessagesContext.Provider
      value={{
        currentPanel,
        setCurrentPanel,
        openingThreadId,
        setOpeningThreadId,
        loadedThreadId,
        setLoadedThreadId,
      }}
    >
      <div className="@container/page h-[calc(100dvh-var(--page-banner-height)-var(--page-top-margin)-var(--page-bottom-margin)-1px)] w-full overflow-hidden rounded-t-[inherit] bg-white">
        <div
          className="@[800px]/page:grid-cols-[min-content_minmax(340px,1fr)] @[800px]/page:translate-x-0 grid h-full translate-x-[calc(var(--current-panel)*-100%)] grid-cols-[100%_100%]"
          style={
            {
              "--current-panel": { index: 0, main: 1 }[currentPanel],
            } as CSSProperties
          }
        >
          {/* Left panel - 800px/messages list */}
          <div className="@[800px]/page:w-[280px] @[960px]/page:w-[340px] flex w-full flex-col overflow-hidden">
            <div className="border-border-subtle flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <NavButton />
                <div className="flex items-center gap-2">
                  <h1 className="text-content-emphasis text-lg font-semibold leading-7">
                    Messages
                  </h1>
                  <InfoTooltip
                    content={
                      "Chat with your partners in real time, with email notifications & read statuses built in. [Learn more](https://dub.co/help/article/messaging-partners)"
                    }
                  />
                </div>
              </div>
              {permissionsError ? (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Pen2 className="size-4" />}
                  className="size-8 rounded-lg p-0"
                  disabledTooltip={permissionsError}
                />
              ) : (
                <PartnerSelector
                  selectedPartnerId={partnerId ?? null}
                  setSelectedPartnerId={(id) => {
                    if (id !== partnerId) {
                      setCurrentPanel("main");
                      setOpeningThreadId(id);
                    }
                    router.push(`/${workspaceSlug}/program/messages/${id}`);
                  }}
                  trigger={
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<Pen2 className="size-4" />}
                      className="size-8 rounded-lg p-0"
                    />
                  }
                  matchTriggerWidth={false}
                  optionClassName="sm:max-w-[320px]"
                />
              )}
            </div>
            <div className="scrollbar-hide grow overflow-y-auto">
              {partnerMessages?.length || isLoading ? (
                <MessagesList
                  groupedMessages={partnerMessages?.map(
                    ({ partner, messages }) => ({
                      ...partner,
                      messages,
                      href: `/${workspaceSlug}/program/messages/${partner.id}`,
                      unread: messages.some(
                        (message) =>
                          message.senderPartnerId && !message.readInApp,
                      ),
                    }),
                  )}
                  activeId={partnerId}
                />
              ) : error ? (
                <div className="text-content-subtle flex size-full items-center justify-center text-sm">
                  Failed to load messages
                </div>
              ) : (
                <div className="flex size-full flex-col items-center justify-center px-4">
                  <Msgs className="size-10 text-black" />
                  <div className="mt-6 max-w-64 text-center">
                    <span className="text-content-emphasis text-base font-semibold">
                      You don't have any messages
                    </span>
                    <p className="text-content-subtle text-sm font-medium">
                      When you receive a new message, it will appear here. You
                      can also start a conversation at any time.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-border-subtle @[800px]/page:border-l relative size-full min-h-0">
            {children}
            {showThreadSpinner && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>
      </div>
    </MessagesContext.Provider>
  );
}
