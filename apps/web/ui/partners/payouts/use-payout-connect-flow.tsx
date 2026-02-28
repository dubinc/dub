"use client";

import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import { generateStripeAccountLink } from "@/lib/actions/partners/generate-stripe-account-link";
import { generateStripeRecipientAccountLink } from "@/lib/actions/partners/generate-stripe-recipient-account-link";
import { useBankAccountRequirementsModal } from "@/ui/partners/payouts/bank-account-requirements-modal";
import { useStablecoinPayoutModal } from "@/ui/partners/payouts/stablecoin-payout-modal";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

export function usePayoutConnectFlow(options?: { closeParent?: () => void }) {
  const router = useRouter();
  const closeParent = options?.closeParent;

  const {
    executeAsync: executeStripeConnect,
    isPending: isStripeConnectPending,
  } = useAction(generateStripeAccountLink, {
    onSuccess: ({ data }) => {
      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const {
    executeAsync: executeStablecoinConnect,
    isPending: isStablecoinConnectPending,
  } = useAction(generateStripeRecipientAccountLink, {
    onSuccess: ({ data }) => {
      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const {
    executeAsync: executePaypalConnect,
    isPending: isPaypalConnectPending,
  } = useAction(generatePaypalOAuthUrl, {
    onSuccess: ({ data }) => {
      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const {
    setShowBankAccountRequirementsModal,
    BankAccountRequirementsModal: BankAccountRequirementsModalElement,
  } = useBankAccountRequirementsModal({
    onContinue: async () => {
      await executeStripeConnect();
    },
  });

  const {
    setShowStablecoinPayoutModal,
    StablecoinPayoutModal: StablecoinPayoutModalElement,
  } = useStablecoinPayoutModal({
    onContinue: async () => {
      await executeStablecoinConnect();
    },
  });

  const connect = useCallback(
    async (
      type: PartnerPayoutMethod,
      connectOptions?: { isManage?: boolean },
    ) => {
      const isManage = connectOptions?.isManage ?? false;

      if (type === "connect") {
        if (isManage) {
          await executeStripeConnect();
        } else {
          closeParent?.();
          setShowBankAccountRequirementsModal(true);
        }
        return;
      }

      if (type === "stablecoin") {
        if (isManage) {
          await executeStablecoinConnect();
        } else {
          closeParent?.();
          setShowStablecoinPayoutModal(true);
        }
        return;
      }

      if (type === "paypal") {
        closeParent?.();
        await executePaypalConnect();
      }
    },
    [
      closeParent,
      setShowBankAccountRequirementsModal,
      setShowStablecoinPayoutModal,
      executeStripeConnect,
      executeStablecoinConnect,
      executePaypalConnect,
    ],
  );

  const isPending = useMemo(
    () =>
      isStripeConnectPending ||
      isStablecoinConnectPending ||
      isPaypalConnectPending,
    [
      isStripeConnectPending,
      isStablecoinConnectPending,
      isPaypalConnectPending,
    ],
  );

  return {
    connect,
    isPending,
    BankAccountRequirementsModal: BankAccountRequirementsModalElement,
    StablecoinPayoutModal: StablecoinPayoutModalElement,
  };
}
