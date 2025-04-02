"use client";
import { useDeleteAccountModal } from "@/ui/modals/delete-account-modal";
import { Button } from "@dub/ui";

export default function DeleteAccountSection() {
  const { setShowDeleteAccountModal, DeleteAccountModal } =
    useDeleteAccountModal();

  return (
    <div className="rounded-lg border border-red-600 bg-white">
      <DeleteAccountModal />
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Delete Account</h2>
        <p className="text-sm text-neutral-500">
          Permanently delete your {process.env.NEXT_PUBLIC_APP_NAME} account,
          all of your workspaces, links and their respective stats. This action
          cannot be undone - please proceed with caution.
        </p>
      </div>
      <div className="border-b border-red-600" />

      <div className="flex items-center justify-end p-3 sm:px-10">
        <div>
          <Button
            text="Delete Account"
            variant="danger"
            onClick={() => setShowDeleteAccountModal(true)}
          />
        </div>
      </div>
    </div>
  );
}
