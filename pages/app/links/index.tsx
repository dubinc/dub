import AppLayout from "components/layout/app";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useAddLinkModal } from "@/components/app/add-link-modal";
import LinksContainer from "@/components/app/links-container";

export default function Links() {
  const { AddLinkModal, AddLinkButton } = useAddLinkModal({
    domainVerified: true,
    exceededUsage: false,
  });

  return (
    <AppLayout>
      <AddLinkModal />
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">My Dub.sh Links</h1>
            <AddLinkButton />
          </div>
        </MaxWidthWrapper>
      </div>
      <LinksContainer exceededUsage={false} AddLinkButton={AddLinkButton} />
    </AppLayout>
  );
}
