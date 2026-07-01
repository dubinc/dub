"use client";

import { NetworkPartnerProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { EnvelopeArrowRight } from "@dub/ui/icons";
import { EmailContent } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-email-preview";
import { InviteNetworkPartnerSheet } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-network-partner-sheet";
import { useState } from "react";

export function NetworkInviteControl({
  partner,
  nested,
  onSuccess,
}: {
  partner: NetworkPartnerProps;
  nested?: boolean;
  onSuccess: () => void;
}) {
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteEmailContent, setInviteEmailContent] =
    useState<EmailContent | null>(null);

  if (partner.invitedAt || partner.recruitedAt) return null;

  return (
    <>
      <InviteNetworkPartnerSheet
        nested={nested}
        isOpen={showInviteSheet}
        setIsOpen={setShowInviteSheet}
        partner={partner}
        emailContent={inviteEmailContent}
        onEmailContentChange={setInviteEmailContent}
        onSuccess={onSuccess}
      />
      <Button
        type="button"
        variant="primary"
        text="Invite"
        icon={<EnvelopeArrowRight className="size-4" />}
        onClick={() => setShowInviteSheet(true)}
        className="h-9 rounded-lg px-3"
      />
    </>
  );
}
