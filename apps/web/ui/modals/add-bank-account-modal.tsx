import { addBankAccountAction } from "@/lib/actions/add-bank-account";
import { addBankAccountSchema } from "@/lib/dots/schemas";
import useWorkspace from "@/lib/swr/use-workspace";
import z from "@/lib/zod";
import { Button, Modal } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface AddBankAccountProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

type BankAccount = z.infer<typeof addBankAccountSchema>;

interface AddBankAccountFormProps {
  closeModal: () => void;
}

const AddBankAccount = ({ showModal, setShowModal }: AddBankAccountProps) => {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      drawerRootProps={{ repositionInputs: false }}
    >
      <h3 className="border-b border-gray-200 px-4 py-4 text-lg font-medium sm:px-6">
        Add bank account
      </h3>
      <div className="scrollbar-hide mt-6 max-h-[calc(100dvh-200px)] overflow-auto overflow-y-scroll">
        <AddBankAccountForm closeModal={() => setShowModal(false)} />
      </div>
    </Modal>
  );
};

const AddBankAccountForm = ({ closeModal }: AddBankAccountFormProps) => {
  const { id: workspaceId, mutate } = useWorkspace();

  const {
    register,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<BankAccount>({
    resolver: zodResolver(addBankAccountSchema),
  });

  const { executeAsync, isExecuting } = useAction(addBankAccountAction, {
    async onSuccess() {
      toast.success(
        "Bank account added successfully. Waiting for verification.",
      );
      mutate();
      closeModal();
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  const onSubmit = async (data: BankAccount) => {
    await executeAsync({ ...data, workspaceId: workspaceId! });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-y-6 px-4 text-left sm:px-6">
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="accountNumber"
              className="flex items-center space-x-2"
            >
              <h2 className="text-sm font-medium text-gray-900">
                Account number
              </h2>
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                {...register("accountNumber")}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                required
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="routingNumber"
              className="flex items-center space-x-2"
            >
              <h2 className="text-sm font-medium text-gray-900">
                Routing number
              </h2>
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                {...register("routingNumber")}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="accountType"
              className="flex items-center space-x-2"
            >
              <h2 className="text-sm font-medium text-gray-900">
                Account type
              </h2>
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <select
                {...register("accountType")}
                className="block w-full rounded-md border-gray-300 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                required
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
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
          text="Add bank account"
          className="h-9 w-fit"
          disabled={!isValid}
          loading={isSubmitting || isExecuting}
        />
      </div>
    </form>
  );
};

export function useAddBankAccountModal() {
  const [showAddBankAccountModal, setShowAddBankAccountModal] = useState(false);

  const AddBankAccountModal = useCallback(() => {
    return (
      <AddBankAccount
        showModal={showAddBankAccountModal}
        setShowModal={setShowAddBankAccountModal}
      />
    );
  }, [showAddBankAccountModal, setShowAddBankAccountModal]);

  return useMemo(
    () => ({ setShowAddBankAccountModal, AddBankAccountModal }),
    [setShowAddBankAccountModal, AddBankAccountModal],
  );
}
