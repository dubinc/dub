import { depositFundsAction } from "@/lib/actions/deposit-funds";
import { depositFundsSchema } from "@/lib/dots/schemas";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const DepositFunds = ({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}) => {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      drawerRootProps={{ repositionInputs: false }}
    >
      <h3 className="border-b border-gray-200 px-4 py-4 text-lg font-medium sm:px-6">
        Deposit funds
      </h3>
      <div className="scrollbar-hide mt-6 max-h-[calc(100dvh-200px)] overflow-auto overflow-y-scroll">
        <DepositFundsForm closeModal={() => setShowModal(false)} />
      </div>
    </Modal>
  );
};

const DepositFundsForm = ({ closeModal }: { closeModal: () => void }) => {
  const { id: workspaceId, mutate } = useWorkspace();

  const {
    register,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<z.infer<typeof depositFundsSchema>>({
    resolver: zodResolver(depositFundsSchema),
  });

  const { executeAsync, isExecuting } = useAction(depositFundsAction, {
    async onSuccess() {
      toast.success("Funds deposited successfully.");
      mutate();
      closeModal();
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  const onSubmit = async (data: z.infer<typeof depositFundsSchema>) => {
    await executeAsync({ ...data, workspaceId: workspaceId! });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-y-6 px-4 text-left sm:px-6">
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="amount" className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-gray-900">Amount</h2>
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                {...register("amount")}
                type="number"
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                required
                autoFocus
                autoComplete="off"
                placeholder="100.00"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-2 border-t border-gray-200 px-4 py-4 sm:px-6">
        <Button
          type="button"
          variant="secondary"
          text="Cancel"
          className="h-9 w-fit"
          disabled={isSubmitting || isExecuting}
          onClick={closeModal}
        />

        <Button
          type="submit"
          text="Deposit funds"
          className="h-9 w-fit"
          disabled={!isValid}
          loading={isSubmitting || isExecuting}
        />
      </div>
    </form>
  );
};

export function useDepositFundsModal() {
  const [showDepositFundsModal, setShowDepositFundsModal] = useState(false);

  const DepositFundsModal = useCallback(() => {
    return (
      <DepositFunds
        showModal={showDepositFundsModal}
        setShowModal={setShowDepositFundsModal}
      />
    );
  }, [showDepositFundsModal, setShowDepositFundsModal]);

  return useMemo(
    () => ({ setShowDepositFundsModal, DepositFundsModal }),
    [setShowDepositFundsModal, DepositFundsModal],
  );
}
