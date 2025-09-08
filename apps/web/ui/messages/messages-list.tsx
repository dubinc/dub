import { OG_AVATAR_URL, cn, timeAgo } from "@dub/utils";
import Link from "next/link";
import { useMessagesContext } from "./messages-context";

export function MessagesList({
  groupedMessages,
  activeId,
}: {
  groupedMessages:
    | {
        id: string;
        name: string;
        image: string | null;
        messages: { text: string; createdAt: Date }[];
        href: string;
        unread?: boolean;
      }[]
    | undefined;
  activeId?: string;
}) {
  const { setCurrentPanel } = useMessagesContext();

  return (
    <div className="flex w-full flex-col">
      {groupedMessages
        ? groupedMessages.map((group) => {
            const lastMessage = group.messages.at(-1);

            return (
              <Link
                key={group.id}
                href={group.href}
                onClick={() => setCurrentPanel("main")}
                className={cn(
                  "border-border-subtle flex w-full items-center gap-2.5 border-b bg-white px-6 py-4",
                  group.id === activeId ? "bg-bg-subtle" : "hover:bg-bg-muted",
                )}
              >
                <div className="relative shrink-0">
                  <img
                    src={group.image || `${OG_AVATAR_URL}${group.name}`}
                    alt={`${group.name} avatar`}
                    className="size-8 rounded-full"
                  />
                  {group.unread && (
                    <div className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white bg-blue-600" />
                  )}
                </div>
                <div className="min-w-0 grow">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-content-emphasis text-sm font-semibold">
                      {group.name}
                    </span>
                    {lastMessage && (
                      <span className="text-content-subtle text-xs font-medium">
                        {timeAgo(lastMessage.createdAt, { withAgo: true })}
                      </span>
                    )}
                  </div>
                  <span className="text-content-subtle block truncate text-sm font-medium">
                    {lastMessage?.text}
                  </span>
                </div>
              </Link>
            );
          })
        : [...Array(3)].map((_, index) => (
            <div
              key={index}
              className="border-border-subtle flex w-full items-center gap-2.5 border-b bg-white px-6 py-4"
            >
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />
              <div className="min-w-0 grow">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-5 w-20 animate-pulse rounded-md bg-neutral-200" />
                  <div className="h-4 w-10 animate-pulse rounded-md bg-neutral-200" />
                </div>
                <div className="mt-1 h-4 w-full animate-pulse rounded-md bg-neutral-200" />
              </div>
            </div>
          ))}
    </div>
  );
}
