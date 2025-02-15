import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import { CardList, useMediaQuery } from "@dub/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FolderIcon } from "../folders/folder-icon";
import { useLinkBuilder } from "../modals/link-builder";
import { LinkDetailsColumn } from "./link-details-column";
import { LinkTitleColumn } from "./link-title-column";
import { ResponseLink } from "./links-container";

export function LinkCard({ link }: { link: ResponseLink }) {
  const { isMobile } = useMediaQuery();

  const { setShowLinkBuilder, LinkBuilder } = useLinkBuilder({
    props: link,
  });
  const searchParams = useSearchParams();
  const { slug } = useWorkspace();
  const { folders } = useFolders();

  const folder = folders?.find((folder) => folder.id === link.folderId);

  return (
    <>
      <LinkBuilder />
      <CardList.Card
        key={link.id}
        onClick={isMobile ? undefined : () => setShowLinkBuilder(true)}
        innerClassName="flex items-center gap-5 sm:gap-8 md:gap-12 text-sm"
        {...(link.folderId &&
          searchParams.get("folderId") !== link.folderId && {
            banner: (
              <div className="flex items-center justify-between gap-2 rounded-t-xl border-b border-neutral-100 bg-neutral-50 px-5 py-2 text-xs">
                <div className="flex items-center gap-1.5">
                  {folder ? (
                    <FolderIcon
                      folder={folder}
                      shape="square"
                      className="rounded"
                      innerClassName="p-0.5"
                      iconClassName="size-3"
                    />
                  ) : (
                    <div className="size-4 rounded-md bg-neutral-200" />
                  )}
                  {folder ? (
                    <span className="font-medium text-neutral-900">
                      {folder.name}
                    </span>
                  ) : (
                    <div className="h-4 w-20 rounded-md bg-neutral-200" />
                  )}
                </div>
                <Link
                  href={`/${slug}?folderId=${folder?.id}`}
                  className="text-neutral-500 underline transition-colors hover:text-neutral-800"
                >
                  Open folder
                </Link>
              </div>
            ),
          })}
      >
        <div className="min-w-0 grow">
          <LinkTitleColumn link={link} />
        </div>
        <LinkDetailsColumn link={link} />
      </CardList.Card>
    </>
  );
}
