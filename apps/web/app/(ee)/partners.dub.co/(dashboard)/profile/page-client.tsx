"use client";

import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useMergePartnerAccountsModal } from "@/ui/partners/merge-accounts/merge-partner-accounts-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover, Users2 } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import { AboutYouForm } from "./about-you-form";
import { HowYouWorkForm } from "./how-you-work-form";
import { ProfileDetailsForm } from "./profile-details-form";
import { ProfileDiscoveryGuide } from "./profile-discovery-guide";
import { usePartnerDiscoveryRequirements } from "./use-partner-discovery-requirements";

export function ProfileSettingsPageClient() {
  const { partner } = usePartnerProfile();
  const tasks = usePartnerDiscoveryRequirements();

  const allTasksCompleted = useMemo(
    () => tasks?.every(({ completed }) => completed) ?? false,
    [tasks],
  );

  return (
    <PageContent
      title="Profile"
      titleInfo={{
        title:
          "Build a stronger partner profile and increase trust by adding and verifying your website and social accounts.",
        href: "https://dub.co/help/article/partner-profile",
      }}
      controls={<Controls />}
    >
      <PageWidthWrapper className="mb-20 flex flex-col gap-6">
        {partner && !allTasksCompleted && <ProfileDiscoveryGuide />}
        <ProfileDetailsForm partner={partner} />
        <AboutYouForm partner={partner} />
        <HowYouWorkForm partner={partner} />
      </PageWidthWrapper>
    </PageContent>
  );
}

function Controls() {
  const { partner } = usePartnerProfile();
  const disabled = partner
    ? !hasPermission(partner.role, "partner_profile.update")
    : true;

  const [isOpen, setIsOpen] = useState(false);

  const { MergePartnerAccountsModal, setShowMergePartnerAccountsModal } =
    useMergePartnerAccountsModal();

  return (
    <>
      <MergePartnerAccountsModal />

      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="w-full p-2 md:w-56">
            <button
              onClick={() => {
                if (!disabled) {
                  setShowMergePartnerAccountsModal(true);
                  setIsOpen(false);
                }
              }}
              disabled={disabled}
              className={cn(
                "w-full rounded-md p-2",
                disabled
                  ? "cursor-not-allowed bg-neutral-50 text-neutral-400"
                  : "hover:bg-neutral-100 active:bg-neutral-200",
              )}
            >
              <div className="flex items-center gap-2 text-left">
                <Users2 className="size-4 shrink-0" />
                <span className="text-sm font-medium">Merge accounts</span>
              </div>
            </button>
          </div>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-9 whitespace-nowrap px-2"
          variant="secondary"
          icon={<ThreeDots className="size-4 shrink-0" />}
          onClick={() => setIsOpen(!isOpen)}
        />
      </Popover>
    </>
  );
}
