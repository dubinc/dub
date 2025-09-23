"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useMergePartnerAccountsModal } from "@/ui/partners/merge-accounts/merge-partner-accounts-modal";
import { Button } from "@dub/ui";
import { AboutYouForm } from "./about-you-form";
import { ProfileDetailsForm } from "./profile-details-form";

export function ProfileSettingsPageClient() {
  const { partner } = usePartnerProfile();

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
        <ProfileDetailsForm partner={partner} />
        <AboutYouForm partner={partner} />
      </PageWidthWrapper>
    </PageContent>
  );
}

function Controls() {
  const { MergePartnerAccountsModal, setShowMergePartnerAccountsModal } =
    useMergePartnerAccountsModal();

  return (
    <>
      <MergePartnerAccountsModal />
      <Button
        text="Merge accounts"
        variant="secondary"
        className="h-8 w-fit px-2.5"
        onClick={() => setShowMergePartnerAccountsModal(true)}
      />
    </>
  );
}
