import { unsortedLinks } from "@/lib/folder/constants";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useFolder from "@/lib/swr/use-folder";
import useLinks from "@/lib/swr/use-links";
import { LinkProps } from "@/lib/types";
import { FolderIcon } from "@/ui/folders/folder-icon";
import { Combobox, LinkLogo } from "@dub/ui";
import {
  cn,
  getApexDomain,
  getPrettyUrl,
  getUrlWithoutUTMParams,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { PropsWithChildren, useMemo, useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { useLinkBuilderContext } from "./link-builder-provider";

export function LinkBuilderHeader({
  onClose,
  onSelectLink,
  children,
  className,
}: PropsWithChildren<{
  onClose?: () => void;
  onSelectLink?: (link: LinkProps) => void;
  className?: string;
}>) {
  const { props, workspace } = useLinkBuilderContext();
  const { isDirty } = useFormState();

  const [url, key, domain, folderId] = useWatch({
    name: ["url", "key", "domain", "folderId"],
  });

  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);

  const shortLink = useMemo(
    () =>
      linkConstructor({
        key,
        domain,
        pretty: true,
      }),
    [key, domain],
  );

  const { canAddFolder } = getPlanCapabilities(workspace.plan);
  const { folder, loading: isFolderLoading } = useFolder({
    folderId,
    enabled: !!folderId,
  });

  const folderContent = useMemo(() => {
    if (folderId && folderId !== "unsorted" && folder?.id !== folderId)
      return (
        <div className="h-7 w-24 animate-pulse rounded-md bg-neutral-200" />
      );

    let selectedFolder =
      !folderId || folderId === "unsorted"
        ? unsortedLinks
        : folder ?? unsortedLinks;

    return (
      <>
        {canAddFolder && <FolderIcon folder={selectedFolder} shape="square" />}
        <span className="min-w-0 truncate text-sm font-semibold text-neutral-800">
          {selectedFolder.name}
        </span>
      </>
    );
  }, [folderId, folder, isFolderLoading]);

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 px-6 py-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 max-w-full items-center gap-1">
        {canAddFolder ? (
          <Link
            href={`/${workspace.slug}/links?folderId=${folderId ?? "unsorted"}`}
            className="flex min-w-0 items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-neutral-100"
            onClick={
              isDirty
                ? (e) => {
                    if (
                      !window.confirm(
                        "Are you sure you want to discard your changes and continue?",
                      )
                    )
                      e.preventDefault();
                  }
                : undefined
            }
          >
            {folderContent}
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-2 px-1.5">
            {folderContent}
          </div>
        )}

        <ChevronRight className="hidden size-4 shrink-0 text-neutral-500 md:block" />
        {onSelectLink ? (
          <div className="min-w-0">
            <LinkSelector
              selectedLink={props!}
              onSelect={onSelectLink}
              folderId={folderId}
            />
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2 px-1">
            <LinkLogo
              apexDomain={getApexDomain(debouncedUrl)}
              className="size-5 shrink-0 sm:size-5 [&>*]:size-3 sm:[&>*]:size-4"
            />
            <h3 className="!mt-0 max-w-sm truncate text-sm font-medium">
              {props ? `Edit ${shortLink}` : "New link"}
            </h3>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {children}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="group hidden rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:block"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

const getLinkOption = (link: LinkProps) => ({
  value: link.id,
  label: linkConstructor({ ...link, pretty: true }),
  icon: (
    <LinkLogo
      apexDomain={getApexDomain(link.url)}
      className="mr-1 size-4 shrink-0 sm:size-4"
    />
  ),
  meta: {
    url: link.url,
  },
});

function LinkSelector({
  selectedLink: selectedLinkProp,
  onSelect,
  disabled,
  folderId,
}: {
  selectedLink: LinkProps;
  onSelect: (link: LinkProps) => void;
  disabled?: boolean;
  folderId?: string;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { links } = useLinks(
    {
      search: debouncedSearch,
      ...(folderId && { folderId }),
    },
    {
      keepPreviousData: false,
    },
  );

  const options = useMemo(
    () => links?.map((link) => getLinkOption(link)),
    [links],
  );

  const [selectedLink, setSelectedLink] = useState(selectedLinkProp);
  const selectedOption = useMemo(
    () => getLinkOption(selectedLink),
    [selectedLink],
  );

  return (
    <Combobox
      caret
      side="top" // Since this control is near the bottom of the page, prefer top to avoid jumping
      options={options}
      selected={selectedOption}
      setSelected={(selected) => {
        const link = links?.find((link) => link.id === selected.value);
        if (!link) return;

        setSelectedLink(link);
        onSelect(link);
      }}
      shouldFilter={false}
      onSearchChange={setSearch}
      buttonProps={{
        disabled,
        className: cn(
          "h-auto py-2 px-2 w-full max-w-full text-neutral-700 border-none items-start text-sm font-medium !ring-0",
          "hover:bg-neutral-100 active:bg-neutral-200 data-[state=open]:bg-neutral-100",
        ),
      }}
    >
      {selectedLink ? (
        <div className="flex min-w-0 items-center gap-2">
          <LinkLogo
            apexDomain={getApexDomain(selectedLink.url)}
            className="size-4 shrink-0 sm:size-4"
          />
          <span className="min-w-0 truncate">
            {truncate(getPrettyUrl(selectedLink.shortLink), 32)}
          </span>
        </div>
      ) : (
        <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
      )}
    </Combobox>
  );
}
