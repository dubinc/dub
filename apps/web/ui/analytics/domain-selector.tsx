import useDomains from "@/lib/swr/use-domains";
import { InputSelect, useRouterStuff } from "@dub/ui";
import { GOOGLE_FAVICON_URL } from "@dub/utils";
import { Globe } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DomainSelector() {
  const router = useRouter();
  const { queryParams } = useRouterStuff();

  const { allActiveDomains: domains } = useDomains();
  const searchParams = useSearchParams();
  const selectedDomainId = searchParams?.get("domainId");

  return domains && domains.length > 0 ? (
    <InputSelect
      adjustForMobile
      items={domains.map(({ id, slug }) => ({
        id,
        value: slug,
      }))}
      icon={<Globe className="h-4 w-4 text-black" />}
      selectedItem={{
        id: selectedDomainId!,
        value: domains.find(({ id }) => id === selectedDomainId)?.slug || "",
        image: selectedDomainId
          ? `${GOOGLE_FAVICON_URL}${
              domains.find(({ id }) => id === selectedDomainId)?.target
            }`
          : undefined,
      }}
      setSelectedItem={(domain) => {
        if (domain && typeof domain !== "function" && domain.id)
          router.push(
            queryParams({
              set: { domainId: domain.id },
              getNewPath: true,
            }) as string,
          );
        else
          router.push(
            queryParams({ del: "domainId", getNewPath: true }) as string,
          );
      }}
      inputAttrs={{
        placeholder: "Filter domains",
      }}
      className="md:w-auto"
    />
  ) : undefined;
}
