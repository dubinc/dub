"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerNetworkInvitesUsage from "@/lib/swr/use-partner-network-invites-usage";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { useTrialLimitActivateModal } from "@/ui/modals/trial-limit-activate-modal";
import { PartnerStarButton } from "@/ui/partners/partner-star-button";
import { Button } from "@dub/ui";
import { isWorkspaceBillingTrialActive } from "@dub/utils";
import { EmailContent } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-email-preview";
import { InviteNetworkPartnerSheet } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-network-partner-sheet";
import { useState } from "react";

export function NetworkPartnerCardActions({
  partner,
  onToggleStarred,
  showInvite,
}: {
  partner: NetworkPartnerProps;
  onToggleStarred?: (starred: boolean) => void;
  showInvite: boolean;
}) {
  const { trialEndsAt } = useWorkspace();
  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteEmailContent, setInviteEmailContent] =
    useState<EmailContent | null>(null);

  const { remaining: remainingInvites } = usePartnerNetworkInvitesUsage();
  const atNetworkInviteLimit = remainingInvites === 0;
  const disabled = atNetworkInviteLimit && !trialActive;

  const handleInvitePress = () => {
    if (trialActive && atNetworkInviteLimit) {
      openTrialLimitModal("networkInvites");
      return;
    }
    setShowInviteSheet(true);
  };

  return (
    <>
      <TrialLimitActivateModal />
      <InviteNetworkPartnerSheet
        nested
        isOpen={showInviteSheet}
        setIsOpen={setShowInviteSheet}
        partner={partner}
        emailContent={inviteEmailContent}
        onEmailContentChange={setInviteEmailContent}
        onSuccess={() => {
          mutatePrefix("/api/network/partners");
        }}
        {...(trialActive && {
          onInviteLimitError: () => openTrialLimitModal("networkInvites"),
        })}
      />
      <div className="flex items-center gap-2">
        {showInvite && (
          <Button
            type="button"
            variant="primary"
            text="Invite"
            disabled={disabled}
            onClick={handleInvitePress}
            className="h-8 rounded-lg px-3"
          />
        )}
        {onToggleStarred && (
          <PartnerStarButton
            partner={partner}
            onToggleStarred={onToggleStarred}
            className="size-8"
            iconSize="size-4"
          />
        )}
      </div>
    </>
  );
}
