"use client";

import { updatePartnerProfileAction } from "@/lib/actions/partners/update-partner-profile";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useMergePartnerAccountsModal } from "@/ui/partners/merge-accounts/merge-partner-accounts-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover, Switch, Tooltip, Users2, UserSearch } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
      controls={
        <Controls
          showDiscoverableToggle={Boolean(
            allTasksCompleted || partner?.discoverableAt,
          )}
        />
      }
    >
      <PageWidthWrapper className="mb-20 flex flex-col gap-6">
        {partner && !allTasksCompleted && (
          <ProfileDiscoveryGuide partner={partner} />
        )}
        <ProfileDetailsForm partner={partner} />
        <AboutYouForm partner={partner} />
        <HowYouWorkForm partner={partner} />
      </PageWidthWrapper>
    </PageContent>
  );
}

function Controls({
  showDiscoverableToggle,
}: {
  showDiscoverableToggle: boolean;
}) {
  const { partner, mutate } = usePartnerProfile();

  const [isOpen, setIsOpen] = useState(false);

  const { MergePartnerAccountsModal, setShowMergePartnerAccountsModal } =
    useMergePartnerAccountsModal();

  const { executeAsync } = useAction(updatePartnerProfileAction, {
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  return (
    <>
      {showDiscoverableToggle && partner && (
        <Tooltip
          content={
            <p className="text-content-default max-w-xs p-3 text-xs">
              <strong className="font-semibold">
                Discoverable is {partner.discoverableAt ? "on" : "off"}
              </strong>{" "}
              - Programs {partner.discoverableAt ? "will" : "won't"} be able to
              discover your profile and send invites.
            </p>
          }
        >
          <label
            className={cn(
              "bg-bg-subtle text-content-default border-border-subtle flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3",
              "transition-colors duration-100 ease-out",
              !!partner.discoverableAt &&
                "bg-bg-inverted text-content-inverted border-bg-inverted",
            )}
          >
            <UserSearch className="size-4 shrink-0" />
            <span className="text-sm font-medium">Discoverable</span>
            <Switch
              checked={!!partner.discoverableAt}
              fn={(checked) =>
                mutate(
                  async () => {
                    const result = await executeAsync({
                      discoverable: checked,
                    });

                    if (result?.serverError || result?.validationErrors)
                      throw new Error("Failed to update profile");

                    return {
                      ...partner,
                      discoverableAt: checked ? new Date() : null,
                    };
                  },
                  {
                    optimisticData: () => ({
                      ...partner,
                      discoverableAt: checked ? new Date() : null,
                    }),
                  },
                )
              }
              trackDimensions="radix-state-checked:bg-neutral-600 focus-visible:ring-black/20"
            />
          </label>
        </Tooltip>
      )}
      <MergePartnerAccountsModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="w-full p-2 md:w-56">
            <button
              onClick={() => {
                setShowMergePartnerAccountsModal(true);
                setIsOpen(false);
              }}
              className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
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
        />
      </Popover>
    </>
  );
}
