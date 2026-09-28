"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { useTrialLimitActivateModal } from "@/ui/modals/trial-limit-activate-modal";
import {
  Button,
  TooltipContent,
  useKeyboardShortcut,
  useMediaQuery,
} from "@dub/ui";
import { isWorkspaceBillingTrialActive } from "@dub/utils";
import { useInvitePartnerSheet } from "./invite-partner-sheet";

export function InvitePartnerButton() {
  const { isMobile } = useMediaQuery();
  const { slug, role, exceededPartners, trialEndsAt } = useWorkspace();
  const { invitePartnerSheet, setIsOpen: setShowInvitePartnerSheet } =
    useInvitePartnerSheet();
  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const permissionsError = clientAccessCheck({
    action: "partners.write",
    role,
    customPermissionDescription: "invite partners",
  }).error;

  useKeyboardShortcut("p", () => setShowInvitePartnerSheet(true), {
    enabled: !exceededPartners && !permissionsError,
  });

  return (
    <>
      <TrialLimitActivateModal />
      {invitePartnerSheet}
      <Button
        type="button"
        onClick={() => setShowInvitePartnerSheet(true)}
        text={`Invite${isMobile ? "" : " partner"}`}
        shortcut="P"
        className="h-8 px-3 sm:h-9"
        disabledTooltip={
          exceededPartners ? (
            <TooltipContent
              title="Your have exceeded your partners limit. You need to upgrade to invite more partners."
              cta={trialActive ? "Start paid plan" : "Upgrade plan"}
              {...(trialActive
                ? { onClick: () => openTrialLimitModal("partnerEnrollments") }
                : { href: `/${slug}/upgrade` })}
            />
          ) : (
            permissionsError || undefined
          )
        }
      />
    </>
  );
}
