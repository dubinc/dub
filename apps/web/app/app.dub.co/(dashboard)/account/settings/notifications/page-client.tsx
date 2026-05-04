"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Bell, DubLinksIcon, DubPartnersIcon, UserPlus } from "@dub/ui/icons";

export function NotificationsPageClient() {
  return (
    <div className="p-10">
      <AnimatedEmptyState
        title="Notification preferences"
        description="Email notification controls for product updates, partner activity, and account alerts are coming soon."
        className="border-none"
        cardContent={
          <>
            <Bell className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-neutral-500">
              <DubLinksIcon className="size-3.5" />
              <DubPartnersIcon className="size-3.5" />
              <UserPlus className="size-3.5" />
            </div>
          </>
        }
        pillContent="Coming soon"
      />
    </div>
  );
}
