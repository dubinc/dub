import AppLayout from "components/layout/app";
import useProject from "@/lib/swr/use-project";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import LinksContainer from "@/components/app/links-container";
import ErrorPage from "next/error";

export default function ProjectLinks() {
  const { project, error } = useProject();

  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal({});

  // handle error page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <AppLayout>
      {project && <AddEditLinkModal />}
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">Links</h1>
            <AddEditLinkButton />
          </div>
        </MaxWidthWrapper>
      </div>
      {project && <LinksContainer AddEditLinkButton={AddEditLinkButton} />}
    </AppLayout>
  );
}
