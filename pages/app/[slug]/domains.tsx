import ErrorPage from "next/error";
import LinksContainer from "@/components/app/links/links-container";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "@/lib/swr/use-project";
import { DomainProps } from "@/lib/types";
import useSWR from "swr";
import { useRouter } from "next/router";
import { fetcher } from "@/lib/utils";
import DomainCard from "@/components/app/domains/domain-card";

export default function ProjectDomains() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { project, error } = useProject();

  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal({});

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  const { data: domains } = useSWR<DomainProps[]>(
    `/api/projects/${slug}/domains`,
    fetcher,
    {
      // disable this because it keeps refreshing the state of the modal when its open
      revalidateOnFocus: false,
    },
  );

  return (
    <AppLayout>
      {project && <AddEditLinkModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Domains</h1>
            <AddEditLinkButton />
          </div>
        </MaxWidthWrapper>
      </div>
      {domains && (
        <MaxWidthWrapper className="py-10">
          <ul className="grid grid-cols-1 gap-3">
            {domains.map(({ slug: domain }) => (
              <li key={domain}>
                <DomainCard domain={domain} />
              </li>
            ))}
          </ul>
        </MaxWidthWrapper>
      )}
    </AppLayout>
  );
}
