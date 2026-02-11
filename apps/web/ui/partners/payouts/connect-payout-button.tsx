"use client";

import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useSelectPayoutMethodModal } from "@/ui/partners/payouts/select-payout-method-modal";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { Button, ButtonProps, TooltipContent } from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { useMemo } from "react";

export function ConnectPayoutButton({
  payoutMethodType,
  ...props
}: ButtonProps & { payoutMethodType?: PartnerPayoutMethod }) {
  const { partner, availablePayoutMethods } = usePartnerProfile();

  const { setShowSelectPayoutMethodModal, SelectPayoutMethodModal } =
    useSelectPayoutMethodModal();

  // const { executeAsync: executeStripeAsync, isPending: isStripePending } =
  //   useAction(generateStripeAccountLink, {
  //     onSuccess: ({ data }) => {
  //       if (!data?.url) {
  //         toast.error("Unable to create account link. Please contact support.");
  //         return;
  //       }
  //       router.push(data.url);
  //     },
  //     onError: ({ error }) => {
  //       toast.error(error.serverError);
  //     },
  //   });

  // const { executeAsync: executePaypalAsync, isPending: isPaypalPending } =
  //   useAction(generatePaypalOAuthUrl, {
  //     onSuccess: ({ data }) => {
  //       if (!data?.url) {
  //         toast.error("Unable to redirect to Paypal. Please contact support.");
  //         return;
  //       }
  //       router.push(data.url);
  //     },
  //     onError: ({ error }) => {
  //       toast.error(error.serverError);
  //     },
  //   });

  // const connectPayout = useCallback(async () => {
  //   if (!partner) {
  //     toast.error("Invalid partner profile. Please log out and log back in.");
  //     return;
  //   }

  //   if (!partner.country) {
  //     toast.error(
  //       "You haven't set your country yet. Please go to partners.dub.co/settings to set your country.",
  //     );
  //   }

  //   if (payoutMethod === "paypal") {
  //     await executePaypalAsync();
  //   } else if (payoutMethod === "stripe") {
  //     await executeStripeAsync();
  //   } else {
  //     toast.error(
  //       "Your country is not supported for payout. Please go to partners.dub.co/settings to update your country, or contact support.",
  //     );
  //     return;
  //   }
  // }, [executeStripeAsync, executePaypalAsync, partner]);

  // const { setShowBankAccountRequirementsModal, BankAccountRequirementsModal } =
  //   useBankAccountRequirementsModal({
  //     onContinue: connectPayout,
  //   });

  // const { setShowSelectPayoutMethodModal, SelectPayoutMethodModal } =
  //   useSelectPayoutMethodModal();

  // const handleClick = useCallback(() => {
  //   if (payoutMethodType === "paypal") {
  //     executePaypalAsync();
  //     return;
  //   }

  //   if (payoutMethod === "paypal" && !payoutMethodType) {
  //     connectPayout();
  //     return;
  //   }

  //   if (
  //     payoutMethod === "stripe" ||
  //     availablePayoutMethods?.includes("crypto") ||
  //     availablePayoutMethods?.includes("bankAccount")
  //   ) {
  //     if (payoutMethodType === "crypto") {
  //       connectPayout();
  //     } else if (payoutMethodType === "bankAccount") {
  //       setShowBankAccountRequirementsModal(true);
  //     } else if (!payoutMethodType) {
  //       setShowSelectPayoutMethodModal(true);
  //     } else {
  //       connectPayout();
  //     }
  //     return;
  //   }

  //   toast.error(
  //     "Your country is not supported for payout. Please go to partners.dub.co/settings to update your country, or contact support.",
  //   );
  // }, [
  //   connectPayout,
  //   executePaypalAsync,
  //   // payoutMethod,
  //   // payoutMethodType,
  //   availablePayoutMethods,
  //   setShowBankAccountRequirementsModal,
  //   setShowSelectPayoutMethodModal,
  // ]);

  const errorMessage = useMemo(
    () =>
      !partner?.country
        ? "You haven't set your country yet. Please update your country or contact support."
        : availablePayoutMethods.length === 0
          ? `Your current country (${COUNTRIES[partner.country]}) is not supported for payout. Please update your country or contact support.`
          : undefined,
    [partner, availablePayoutMethods],
  );

  if (partner && !hasPermission(partner.role, "payout_settings.update")) {
    return null;
  }

  return (
    <>
      {SelectPayoutMethodModal}
      <Button
        onClick={() => setShowSelectPayoutMethodModal(true)}
        text="Connect payout"
        disabledTooltip={
          errorMessage && (
            <TooltipContent
              title={errorMessage}
              cta="Update profile settings"
              href="/profile"
            />
          )
        }
        {...props}
      />
    </>
  );
}
