import ErrorPage from "next/error";
import LinksContainer from "@/components/app/links/links-container";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "@/lib/swr/use-project";
import { useAcceptInviteModal } from "@/components/app/modals/accept-invite-modal";
import { useEffect } from "react";
import { useCompleteSetupModal } from "@/components/app/modals/complete-setup-modal";
import useDomains from "@/lib/swr/use-domains";

export default function ProjectLinks() {
  const { slug, error } = useProject();

  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { CompleteSetupModal, setShowCompleteSetupModal } =
    useCompleteSetupModal();

  const { verified, loading } = useDomains();

  // handle errors
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    } else if (!verified && !loading) {
      setShowCompleteSetupModal(true);
    }
  }, [error, verified, loading]);

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <AppLayout>
      {slug && <AddEditLinkModal />}
      {!verified && <CompleteSetupModal />}
      {error && (error.status === 409 || error.status === 410) && (
        <AcceptInviteModal />
      )}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Links</h1>
            <AddEditLinkButton />
          </div>
        </MaxWidthWrapper>
      </div>
      <LinksContainer AddEditLinkButton={AddEditLinkButton} />
    </AppLayout>
  );
}
