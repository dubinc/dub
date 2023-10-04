import { useAddEditDomainModal } from "@/components/app/modals/add-edit-domain-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "#/lib/swr/use-project";
import DomainCard from "@/components/app/domains/domain-card";
import useDomains from "#/lib/swr/use-domains";
import DomainCardPlaceholder from "@/components/app/domains/domain-card-placeholder";
import NoDomainsPlaceholder from "@/components/app/domains/no-domains-placeholder";
import { InfoTooltip, TooltipContent } from "#/ui/tooltip";
import { HOME_DOMAIN } from "#/lib/constants";

export default function ProjectDomains() {
  const { id: projectId } = useProject();

  const { AddEditDomainModal, AddEditDomainButton } = useAddEditDomainModal();

  const { domains } = useDomains();

  return (
    <AppLayout>
      {projectId && <AddEditDomainModal />}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl text-gray-600">Domains</h1>
              <InfoTooltip
                content={
                  <TooltipContent
                    title="Learn more about how to add, configure, and verify custom domains on Dub."
                    href={`${HOME_DOMAIN}/help/article/how-to-add-custom-domain`}
                    target="_blank"
                    cta="Learn more"
                  />
                }
              />
            </div>
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
