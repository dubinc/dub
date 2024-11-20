import useLinks from "@/lib/swr/use-links";
import { LinkProps } from "@/lib/types";
import { Combobox, LinkLogo } from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/src/icons";
import { cn, getApexDomain, linkConstructor } from "@dub/utils";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

const getLinkOption = (link: LinkProps) => ({
  value: link.id,
  label: linkConstructor({ ...link, pretty: true }),
  icon: (
    <LinkLogo
      apexDomain={getApexDomain(link.url)}
      className="h-4 w-4 sm:h-4 sm:w-4"
    />
  ),
  meta: {
    url: link.url,
  },
});

export function PartnerLinkSelector({
  programDomain,
  selectedLinkId,
  setSelectedLinkId,
  showDestinationUrl = true,
  onCreate,
  domain,
  error,
}: {
  programDomain?: string;
  selectedLinkId: string | null;
  setSelectedLinkId: (id: string) => void;
  showDestinationUrl?: boolean;
  onCreate?: (search: string) => Promise<boolean>;
  domain?: string;
  error?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { links } = useLinks(
    { domain: programDomain, search: debouncedSearch },
    {
      keepPreviousData: false,
    },
  );

  const { links: selectedLinks } = useLinks({
    linkIds: [selectedLinkId ?? ""],
  });

  const options = useMemo(
    () => links?.map((link) => getLinkOption(link)),
    [links],
  );

  const selectedOption = useMemo(() => {
    const link = [...(links || []), ...(selectedLinks || [])].find(
      ({ id }) => id === selectedLinkId,
    );
    return link ? getLinkOption(link) : null;
  }, [selectedLinkId, links, selectedLinks]);

  const selectedLink = links?.find((l) => l.id === selectedLinkId);

  return (
    <>
      <Combobox
        selected={selectedOption}
        setSelected={(option) => {
          if (option) setSelectedLinkId(option.value);
        }}
        options={options}
        caret={true}
        placeholder={
          selectedLinkId && !selectedLink ? (
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          ) : (
            `Select${onCreate ? " or create" : ""} referral link`
          )
        }
        searchPlaceholder={onCreate ? "Search or create link..." : "Search..."}
        matchTriggerWidth
        onSearchChange={setSearch}
        buttonProps={{
          className: cn(
            "w-full justify-start border-gray-300 px-3 shadow-sm",
            "data-[state=open]:ring-1 data-[state=open]:ring-gray-500 data-[state=open]:border-gray-500",
            "focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-none",
            !selectedLinkId && "text-gray-400",
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500 data-[state=open]:ring-red-500 data-[state=open]:border-red-500",
          ),
        }}
        shouldFilter={false}
        onCreate={onCreate}
        createLabel={(search) =>
          `Create "${search.startsWith(domain + "/") ? search : domain + "/" + search}"`
        }
      />
      {selectedLink?.url && showDestinationUrl && (
        <div className="ml-2 mt-2 flex items-center gap-1 text-xs text-gray-500">
          <ArrowTurnRight2 className="size-3 shrink-0" />
          <span className="min-w-0 truncate">
            Destination URL:{" "}
            <a
              href={selectedLink.url}
              target="_blank"
              className="underline-offset-2 hover:underline"
            >
              {selectedLink.url}
            </a>
          </span>
        </div>
      )}
    </>
  );
}
