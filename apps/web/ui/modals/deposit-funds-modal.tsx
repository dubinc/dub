import { depositFundsAction } from "@/lib/actions/deposit-funds";
import { depositFundsSchema } from "@/lib/dots/schemas";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
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
    mode: "onChange",
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
            <label>
              <h2 className="text-sm font-medium text-gray-900">Amount</h2>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  type="number"
                  className={cn(
                    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    "pl-7 pr-12",

                    // Hide spin button
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                  )}
                  autoFocus
                  autoComplete="off"
                  placeholder="100.00"
                  {...register("amount")}
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                  $
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                  USD
                </div>
              </div>
            </label>
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
