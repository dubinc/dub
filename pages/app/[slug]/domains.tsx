import ErrorPage from "next/error";
import { useAddEditDomainModal } from "@/components/app/modals/add-edit-domain-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "@/lib/swr/use-project";
import DomainCard from "@/components/app/domains/domain-card";
import useDomains from "@/lib/swr/use-domains";
import DomainCardPlaceholder from "@/components/app/domains/domain-card-placeholder";
import NoDomainsPlaceholder from "@/components/app/domains/no-domains-placeholder";

export default function ProjectDomains() {
  const { id: projectId, error } = useProject();

  const { AddEditDomainModal, AddEditDomainButton } = useAddEditDomainModal();

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  const { domains } = useDomains();

  return (
    <AppLayout>
      {projectId && <AddEditDomainModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Domains</h1>
            <AddEditDomainButton />
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper className="py-10">
        {domains ? (
          domains.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3">
              {domains.map((domain) => (
                <li key={domain.slug}>
                  <DomainCard props={domain} />
                </li>
              ))}
            </ul>
          ) : (
            <NoDomainsPlaceholder AddEditDomainButton={AddEditDomainButton} />
          )
        ) : (
          <DomainCardPlaceholder />
        )}
      </MaxWidthWrapper>
    </AppLayout>
  );
}
