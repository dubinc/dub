"use client";

import { useProgramMessages } from "@/lib/swr/use-program-messages";
import { NavButton } from "@/ui/layout/page-content/nav-button";
import { MessagesContext, MessagesPanel } from "@/ui/messages/messages-context";
import { MessagesList } from "@/ui/messages/messages-list";
import { ProgramSelector } from "@/ui/partners/program-selector";
import {
  Button,
  InfoTooltip,
  SimpleTooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { Msgs, Pen2 } from "@dub/ui/icons";
import { useParams, useRouter } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useState } from "react";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const { programSlug } = useParams() as { programSlug?: string };

  const router = useRouter();
  const { searchParams } = useRouterStuff();

  const { programMessages, isLoading, error } = useProgramMessages({
    query: { messagesLimit: 1 },
  });

  const [currentPanel, setCurrentPanel] = useState<MessagesPanel>(
    programSlug ? "main" : "index",
  );

  useEffect(() => {
    searchParams.get("new") && setCurrentPanel("main");
  }, [searchParams.get("new")]);

  return (
    <MessagesContext.Provider value={{ currentPanel, setCurrentPanel }}>
      <div className="@container/page h-[calc(100dvh-var(--page-top-margin)-1px)] w-full overflow-hidden rounded-t-[inherit] bg-white">
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
                      <SimpleTooltipContent
                        title="Use the messaging center to communicate with the programs you partner with and stay up to date with their latest updates."
                        cta="Learn more"
                        href="https://dub.co/help/article/communicating-with-programs"
                      />
                    }
                  />
                </div>
              </div>
              <ProgramSelector
                selectedProgramSlug={programSlug ?? null}
                setSelectedProgramSlug={(slug) =>
                  router.push(`/messages/${slug}`)
                }
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
            </div>
            <div className="scrollbar-hide grow overflow-y-auto">
              {programMessages?.length || isLoading ? (
                <MessagesList
                  groupedMessages={programMessages?.map(
                    ({ program, messages }) => ({
                      id: program.slug,
                      name: program.name,
                      image: program.logo,
                      messages,
                      href: `/messages/${program.slug}`,
                      unread: messages.some(
                        (message) =>
                          !message.senderPartnerId && !message.readInApp,
                      ),
                    }),
                  )}
                  activeId={programSlug}
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

          <div className="border-border-subtle @[800px]/page:border-l size-full min-h-0">
            {children}
          </div>
        </div>
      </div>
    </MessagesContext.Provider>
  );
}
