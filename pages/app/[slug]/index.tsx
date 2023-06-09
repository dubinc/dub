import LinksContainer from "@/components/app/links/links-container";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "#/lib/swr/use-project";
import { useEffect } from "react";
import { useCompleteSetupModal } from "@/components/app/modals/complete-setup-modal";
import useDomains from "#/lib/swr/use-domains";

export default function ProjectLinks() {
  const { slug, error, loading: loadingProject } = useProject();

  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();

  const { CompleteSetupModal, setShowCompleteSetupModal } =
    useCompleteSetupModal();

  const { verified, loading: loadingDomains } = useDomains();

  useEffect(() => {
    if (!verified && !loadingProject && !loadingDomains && !error) {
      setShowCompleteSetupModal(true);
    }
  }, [verified, loadingProject, loadingDomains, error]);

  return (
    <AppLayout>
      {slug && <AddEditLinkModal />}
      {!verified && <CompleteSetupModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Links</h1>
            <AddEditLinkButton />
          </div>
        </MaxWidthWrapper>
      </div>
      {slug && <LinksContainer AddEditLinkButton={AddEditLinkButton} />}
    </AppLayout>
  );
}
