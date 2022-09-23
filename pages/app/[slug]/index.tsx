import AppLayout from "components/layout/app";
import { useMemo } from "react";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useAddLinkModal } from "@/components/app/add-link-modal";
import LinksContainer from "@/components/app/links-container";
import ErrorPage from "next/error";

export default function ProjectLinks() {
  const { project, error } = useProject();
  const { exceededUsage } = useUsage(project);

  const { AddLinkModal, AddLinkButton } = useAddLinkModal({
    domainVerified: project?.domainVerified,
    exceededUsage,
  });

  // handle error page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <AppLayout>
      {project && <AddLinkModal />}
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">Links</h1>
            <AddLinkButton />
          </div>
        </MaxWidthWrapper>
      </div>
      {project && (
        <LinksContainer
          exceededUsage={exceededUsage}
          AddLinkButton={AddLinkButton}
          domain={project?.domain}
        />
      )}
    </AppLayout>
  );
}
