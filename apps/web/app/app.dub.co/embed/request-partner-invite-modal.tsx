import { requestPartnerInviteSchema } from "@/lib/dots/schemas";
import z from "@/lib/zod";
import { Button, Modal } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type RequestPartnerInvite = z.infer<typeof requestPartnerInviteSchema>;

interface RequestPartnerInviteProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

interface RequestPartnerInviteFormProps {
  closeModal: () => void;
}

const RequestPartnerInvite = ({
  showModal,
  setShowModal,
}: RequestPartnerInviteProps) => {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      drawerRootProps={{ repositionInputs: false }}
    >
      <h3 className="border-b border-gray-200 px-4 py-4 text-lg font-medium sm:px-6">
        Request invite to Dub Partners for receiving payouts
      </h3>
      <div className="scrollbar-hide mt-6 max-h-[calc(100dvh-200px)] overflow-auto overflow-y-scroll">
        <RequestPartnerInviteForm closeModal={() => setShowModal(false)} />
      </div>
    </Modal>
  );
};

const RequestPartnerInviteForm = ({
  closeModal,
}: RequestPartnerInviteFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<RequestPartnerInvite>({
    resolver: zodResolver(requestPartnerInviteSchema),
  });

  const onSubmit = async (data: RequestPartnerInvite) => {
    const response = await fetch("/api/referrals/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.ok) {
      toast.success("Invite request sent successfully!");
      closeModal();
    }

    const { error } = await response.json();
    toast.error(error.message);
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
                {...register("email")}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder="000000000"
                required
                autoFocus
                autoComplete="off"
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
          disabled={isSubmitting}
          onClick={closeModal}
        />

        <Button
          type="submit"
          text="Request invite"
          className="h-9 w-fit"
          disabled={!isValid}
          loading={isSubmitting}
        />
      </div>
    </form>
  );
};

export function useRequestPartnerInviteModal() {
  const [showRequestPartnerInviteModal, setShowRequestPartnerInviteModal] =
    useState(false);

  const RequestPartnerInviteModal = useCallback(() => {
    return (
      <RequestPartnerInvite
        showModal={showRequestPartnerInviteModal}
        setShowModal={setShowRequestPartnerInviteModal}
      />
    );
  }, [showRequestPartnerInviteModal, setShowRequestPartnerInviteModal]);

  return useMemo(
    () => ({
      setShowRequestPartnerInviteModal,
      RequestPartnerInviteModal,
    }),
    [setShowRequestPartnerInviteModal, RequestPartnerInviteModal],
  );
}
