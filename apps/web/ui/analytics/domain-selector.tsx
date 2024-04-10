import useDomains from "@/lib/swr/use-domains";
import { InputSelect, useRouterStuff } from "@dub/ui";
import { DUB_LOGO, GOOGLE_FAVICON_URL, getApexDomain } from "@dub/utils";
import { Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useContext, useMemo } from "react";
import { ModalContext } from "../modals/provider";

export default function DomainSelector() {
  const { queryParams } = useRouterStuff();

  const { allWorkspaceDomains: domains } = useDomains();
  const searchParams = useSearchParams();
  const selectedDomain = useMemo(() => {
    const domain = searchParams.get("domain");
    return domains.find(({ slug }) => slug === domain);
  }, [searchParams, domains]);
  const { setShowAddEditDomainModal } = useContext(ModalContext);

  return domains ? (
    <InputSelect
      adjustForMobile
      items={domains // order by primary domain first
        .sort((a, b) => (a.primary ? -1 : b.primary ? 1 : 0))
        .map(({ id, slug }) => ({
          id,
          value: slug,
          image: `${GOOGLE_FAVICON_URL}${slug}`,
        }))}
      icon={<Globe className="h-4 w-4 text-black" />}
      selectedItem={{
        id: selectedDomain?.id || "",
        value: selectedDomain?.slug || "",
        image: selectedDomain
          ? selectedDomain.target
            ? `${GOOGLE_FAVICON_URL}${getApexDomain(selectedDomain.target)}`
            : DUB_LOGO
          : undefined,
      }}
      setSelectedItem={(domain) => {
        if (domain && typeof domain !== "function" && domain.value) {
          queryParams({
            set: { domain: domain.value },
          });
        } else {
          queryParams({ del: "domain" });
        }
      }}
      inputAttrs={{
        placeholder: "Filter domains",
      }}
      className="w-full lg:w-48"
      noItemsElement={
        <div>
          <h4 className="mb-2 px-2 py-2 text-sm text-gray-600">
            No domains found in this workspace
          </h4>
          <button
            type="button"
            className="w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
            onClick={() => setShowAddEditDomainModal(true)}
          >
            Add a domain
          </button>
        </div>
      }
    />
  ) : (
    <div className="h-10.5 flex w-full animate-pulse items-center space-x-2 rounded-md bg-gray-200 opacity-50 md:w-48" />
  );
}
