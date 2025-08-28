"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { NavButton } from "@/ui/layout/page-content/nav-button";
import { MessagesContext, MessagesPanel } from "@/ui/messages/messages-context";
import { MessagesList } from "@/ui/messages/messages-list";
import { Button } from "@dub/ui";
import { Msgs, Pen2 } from "@dub/ui/icons";
import { subMinutes } from "date-fns";
import { CSSProperties, ReactNode, useState } from "react";
import { toast } from "sonner";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const { slug: workspaceSlug } = useWorkspace();

  // TODO: [Messages] fetch real data
  const partnersWithMessages = [
    {
      id: "pn_1KcRT7do2foT1PZ9zZhLF0Cq",
      name: "Tim Wilson",
      avatar: "https://dubassets.com/avatars/clro5ctqd0000jv084g63ua08",
      messages: [
        {
          text: "Hello, how are you?",
          createdAt: subMinutes(new Date(), 5),
          readStatus: "read-app",
        },
        {
          text: "Great, thanks! What about you?",
          createdAt: subMinutes(new Date(), 5),
          readStatus: "read-app",
        },
      ],
    },
    {
      id: "pn_1JZ8GFVXAMTXEYF33QKWZAZ0Y",
      name: "Tim Partner11",
      avatar:
        "https://dev.dubassets.com/partners/pn_1JZ8GFVXAMTXEYF33QKWZAZ0Y/image_nMMv6kL",
      messages: [
        {
          text: "Thanks for approving my application!",
          createdAt: subMinutes(new Date(), 5),
          readStatus: "read-app",
        },
      ],
    },
  ];
  const isLoading = false;
  const error = null;

  const [currentPanel, setCurrentPanel] = useState<MessagesPanel>("index");

  return (
    <MessagesContext.Provider value={{ currentPanel, setCurrentPanel }}>
      <div className="@container/page h-[calc(100vh-0.5rem-1px)] w-full overflow-hidden rounded-t-[inherit] bg-white">
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
            <div className="border-border-subtle flex h-12 items-center justify-between gap-4 border-b px-4 sm:h-16 sm:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <NavButton />
                <h1 className="text-content-emphasis text-lg font-semibold leading-7">
                  Messages
                </h1>
              </div>
              <Button
                variant="secondary"
                icon={<Pen2 className="size-4" />}
                className="size-8 rounded-lg p-0"
                onClick={() => toast.info("WIP")}
              />
            </div>
            <div className="grow">
              {partnersWithMessages?.length || isLoading ? (
                <MessagesList
                  groupedMessages={partnersWithMessages.map((p) => ({
                    ...p,
                    href: `/${workspaceSlug}/program/messages/${p.id}`,
                  }))}
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

                  <Button
                    variant="primary"
                    className="mt-6 h-8 w-fit rounded-lg"
                    text="Compose message"
                    onClick={() => toast.info("WIP")}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-border-subtle @[800px]/page:border-l size-full">
            {children}
          </div>
        </div>
      </div>
    </MessagesContext.Provider>
  );
}
