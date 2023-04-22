import ErrorPage from "next/error";
import { useAddEditDomainModal } from "@/components/app/modals/add-edit-domain-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "@/lib/swr/use-project";
import DomainCard from "@/components/app/domains/domain-card";
import useDomains from "@/lib/swr/use-domains";

export default function ProjectDomains() {
  const { project, error } = useProject();

  const { AddEditDomainModal, AddEditDomainButton } = useAddEditDomainModal({});

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  const { domains } = useDomains();

  return (
    <AppLayout>
      {project && <AddEditDomainModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Domains</h1>
            <AddEditDomainButton />
          </div>
        </MaxWidthWrapper>
      </div>
      {domains && (
        <MaxWidthWrapper className="py-10">
          <ul className="grid grid-cols-1 gap-3">
            {domains.map((domain) => (
              <li key={domain.slug}>
                <DomainCard props={domain} />
              </li>
            ))}
          </ul>
        </MaxWidthWrapper>
      )}
    </AppLayout>
  );
}
