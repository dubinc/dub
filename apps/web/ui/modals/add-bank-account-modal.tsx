import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Logo, Modal } from "@dub/ui";
import { APP_DOMAIN } from "@dub/utils";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function AddBankAccount({
  showAddBankAccountModal,
  setShowAddBankAccountModal,
}: {
  showAddBankAccountModal: boolean;
  setShowAddBankAccountModal: Dispatch<SetStateAction<boolean>>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { id: workspaceId, slug } = useWorkspace();
  const [isSaving, setIsSaving] = useState(false);

  if (!stripe || !elements) {
    console.error("Stripe.js has not loaded.");
    return;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${APP_DOMAIN}/${slug}/settings/referrals`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsSaving(false);
      return;
    }

    // Confirmation failed. Attempt again with a different payment method.
    if (setupIntent.status == "requires_payment_method") {
      toast.error(
        "Confirmation failed. Attempt again with a different payment method.",
      );
    }

    // Confirmation succeeded
    else if (setupIntent.status == "succeeded") {
      setShowAddBankAccountModal(false);
      setIsSaving(false);
      mutate(`/api/workspaces/${workspaceId}/referrals/stripe/payment-methods`);
      toast.success("Payment method added successfully.");
    }

    // The account needs to be verified via microdeposits.
    // else if (setupIntent.next_action?.type == "verify_with_microdeposits") {
    //   window.location.href =
    //     // @ts-ignore
    //     setupIntent.next_action.verify_with_microdeposits.hosted_verification_url;
    // }
  };

  return (
    <Modal
      showModal={showAddBankAccountModal}
      setShowModal={setShowAddBankAccountModal}
      className="max-w-lg"
      preventDefaultClose={true}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Add Payment Method</h3>
        <p className="text-center text-sm text-gray-500">
          Add your payment methods to enable payouts to your affiliates. You can
          add your US bank account to pull funds.
        </p>
      </div>
      <form onSubmit={onSubmit}>
        <PaymentElement
          options={{
            paymentMethodOrder: ["us_bank_account"],
            layout: "accordion",
          }}
        />
        <Button
          disabled={!stripe || !elements}
          loading={isSaving}
          text="Add Payment Method"
          type="submit"
        />
      </form>
    </Modal>
  );
}

export function useAddBankAccountModal() {
  const [showAddBankAccountModal, setShowAddBankAccountModal] = useState(false);

  const AddBankAccountModalCallback = useCallback(() => {
    return (
      <AddBankAccount
        showAddBankAccountModal={showAddBankAccountModal}
        setShowAddBankAccountModal={setShowAddBankAccountModal}
      />
    );
  }, [showAddBankAccountModal, setShowAddBankAccountModal]);

  return useMemo(
    () => ({
      setShowAddBankAccountModal,
      AddBankAccountModal: AddBankAccountModalCallback,
    }),
    [setShowAddBankAccountModal, AddBankAccountModalCallback],
  );
}
