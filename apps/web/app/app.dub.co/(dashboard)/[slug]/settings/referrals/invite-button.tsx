"use client";

import { useInviteReferralModal } from "@/ui/modals/invite-referral-modal";
import { Button } from "@dub/ui";
import { Mail } from "lucide-react";

const subject = "Create a free account on Dub!";
const body = (url: string) =>
  `Use my referral link to get started with Dub: ${url}`;

export function InviteButton() {
  const { InviteReferralModal, setShowInviteReferralModal } =
    useInviteReferralModal();

  return (
    <>
      <InviteReferralModal />
      <Button
        text="Invite via email"
        icon={<Mail className="size-4" />}
        className="h-9 rounded-lg"
        onClick={() => setShowInviteReferralModal(true)}
      />
    </>
  );
}
