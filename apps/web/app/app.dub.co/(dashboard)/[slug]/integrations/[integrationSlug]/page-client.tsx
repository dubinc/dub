"use client";

import { useDeleteAppModal } from "@/ui/modals/delete-oauth-app-modal";
import { Button, MaxWidthWrapper } from "@dub/ui";

export default function IntegrationPageClient() {
  const { DeleteAppModal, setShowDeleteAppModal } = useDeleteAppModal({
    app: {
      clientId: "123",
      name: "test",
    },
    appType: "authorized",
  });

  return (
    <MaxWidthWrapper className="my-20">
      <DeleteAppModal />
      <div className="w-fit">
        <Button
          text="Uninstall"
          variant="secondary"
          onClick={() => setShowDeleteAppModal(true)}
        />
      </div>
    </MaxWidthWrapper>
  );
}
