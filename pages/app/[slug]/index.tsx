import AppLayout from "components/layout/app";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { useMemo, useEffect } from "react";
import { ProjectProps } from "@/lib/types";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useAddLinkModal } from "@/components/app/add-link-modal";
import LinksContainer from "@/components/app/links-container";

export default function ProjectLinks() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { data: project, error } = useSWR<ProjectProps>(
    router.isReady && `/api/projects/${slug}`,
    fetcher
  );

  useEffect(() => {
    if (error) {
      router.push("/404");
    }
  }, [error]);

  const { data: usage } = useSWR(
    router.isReady &&
      project &&
      `/api/projects/${slug}/domains/${project.domain}/usage`,
    fetcher
  );

  const exceededUsage = useMemo(() => {
    if (usage && project) {
      return usage > project?.usageLimit;
    }
    return true; // assume exceeded usage until we know otherwise (not ideal tho :/)
  }, [usage, project]);

  const { AddLinkModal, AddLinkButton } = useAddLinkModal({
    domainVerified: project?.domainVerified,
    exceededUsage,
    domain: project?.domain,
  });

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
      <LinksContainer
        exceededUsage={exceededUsage}
        AddLinkButton={AddLinkButton}
        domain={project?.domain}
      />
    </AppLayout>
  );
}
