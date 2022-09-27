import AppLayout from "components/layout/app";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import LinksContainer from "@/components/app/links-container";

export default function Links() {
  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal({});

  return (
    <AppLayout>
      <AddEditLinkModal />
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">My Dub.sh Links</h1>
            <AddEditLinkButton />
          </div>
        </MaxWidthWrapper>
      </div>
      <LinksContainer AddEditLinkButton={AddEditLinkButton} />
    </AppLayout>
  );
}
