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
  const selecteddomain = searchParams?.get("domain");

  return domains && domains.length > 0 ? (
    <InputSelect
      adjustForMobile
      items={domains.map(({ id, slug }) => ({
        id,
        value: slug,
        image: `${GOOGLE_FAVICON_URL}${slug}`,
      }))}
      icon={<Globe className="h-4 w-4 text-black" />}
      selectedItem={{
        id: selecteddomain!,
        value: domains.find(({ slug }) => slug === selecteddomain)?.slug || "",
        image: selecteddomain
          ? `${GOOGLE_FAVICON_URL}${
              domains.find(({ slug }) => slug === selecteddomain)?.target
            }`
          : undefined,
      }}
      setSelectedItem={(domain) => {
        console.log(domain);
        if (domain && typeof domain !== "function" && domain.value)
          router.push(
            queryParams({
              set: { domain: domain.value },
              getNewPath: true,
            }) as string,
          );
        else
          router.push(
            queryParams({ del: "domain", getNewPath: true }) as string,
          );
      }}
      inputAttrs={{
        placeholder: "Filter domains",
      }}
      className="lg:w-48"
    />
  ) : undefined;
}
