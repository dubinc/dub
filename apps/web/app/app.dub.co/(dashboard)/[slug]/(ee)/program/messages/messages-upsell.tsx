"use client";

import { PageContent } from "@/ui/layout/page-content";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";

export function MessagesUpsell() {
  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal({
      plan: "Advanced",
    });

  return (
    <PageContent
      title="Messages"
      titleInfo={{
        title:
          "Chat with your partners in real time, with email notifications & read statuses built in.",
        href: "https://dub.co/help/article/messaging-partners",
      }}
    >
      {partnersUpgradeModal}
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-4 [mask-image:linear-gradient(black_60%,transparent)]">
          <DemoMessage
            isCurrentUser={false}
            avatarIndex={9}
            text="I’m planning a YouTube video next week, want me to highlight your new feature?"
          />
          <DemoMessage
            isCurrentUser={true}
            avatarIndex={6}
            programImage="https://assets.dub.co/misc/acme-logo.png"
            text="That’d be perfect! I’ll send you the launch assets. 🎉🎉🎉"
          />
          <DemoMessage
            isCurrentUser={false}
            avatarIndex={9}
            text="Perfect, thanks! Send them over and I’ll make sure to feature it."
          />
        </div>
        <div className="max-w-80 text-pretty text-center">
          <span className="text-base font-medium text-neutral-900">
            Messaging Center
          </span>
          <p className="mt-2 text-pretty text-sm text-neutral-500">
            Messaging makes working with partners easier. Available on Advanced
            plans and higher
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowPartnersUpgradeModal(true)}
            text="Upgrade to Advanced"
            className="h-8 px-3"
          />
        </div>
      </div>
    </PageContent>
  );
}

const DemoMessage = ({
  isCurrentUser,
  avatarIndex,
  programImage,
  text,
}: {
  isCurrentUser: boolean;
  avatarIndex: number;
  programImage?: string;
  text: string;
}) => {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isCurrentUser
          ? "origin-bottom-right flex-row-reverse"
          : "origin-bottom-left",
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className="size-8 shrink-0 rounded-full bg-neutral-300"
          style={{
            backgroundImage:
              "url(https://assets.dub.co/partners/partner-images.jpg)",
            backgroundSize: "1400%", // 14 images
            backgroundPositionX: (14 - (avatarIndex % 14)) * 100 + "%",
          }}
        />
        {programImage && (
          <img
            src={programImage}
            alt="avatar"
            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border border-white"
          />
        )}
      </div>

      <div className={cn("flex flex-col gap-1", isCurrentUser && "items-end")}>
        {/* Message box */}
        <div
          className={cn(
            "max-w-xs whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm",
            isCurrentUser
              ? "text-content-inverted rounded-br bg-neutral-700"
              : "text-content-default rounded-bl bg-neutral-100",
          )}
        >
          {text}
        </div>
      </div>
    </div>
  );
};
