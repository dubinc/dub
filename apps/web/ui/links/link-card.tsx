import useFolder from "@/lib/swr/use-folder";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  CardList,
  ExpandingArrow,
  useIntersectionObserver,
  useMediaQuery,
} from "@dub/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Dispatch,
  memo,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FolderIcon } from "../folders/folder-icon";
import { LinkDetailsColumn } from "./link-details-column";
import { LinkTests } from "./link-tests";
import { LinkTitleColumn } from "./link-title-column";
import { ResponseLink } from "./links-container";

export const LinkCardContext = createContext<{
  showTests: boolean;
  setShowTests: Dispatch<SetStateAction<boolean>>;
} | null>(null);

export function useLinkCardContext() {
  const context = useContext(LinkCardContext);
  if (!context)
    throw new Error("useLinkCardContext must be used within a LinkCard");
  return context;
}

export const LinkCard = memo(({ link }: { link: ResponseLink }) => {
  const [showTests, setShowTests] = useState(false);
  return (
    <LinkCardContext.Provider value={{ showTests, setShowTests }}>
      <LinkCardInner link={link} />
    </LinkCardContext.Provider>
  );
});

const LinkCardInner = memo(({ link }: { link: ResponseLink }) => {
  const { variant } = useContext(CardList.Context);
  const { isMobile } = useMediaQuery();
  const ref = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { slug, defaultFolderId } = useWorkspace();

  const entry = useIntersectionObserver(ref);
  const isInView = entry?.isIntersecting;

  const { folder } = useFolder({
    folderId: link.folderId,
    enabled: isInView,
  });

  const editUrl = useMemo(
    () => `/${slug}/links/${link.domain}/${link.key}`,
    [slug, link.domain, link.key],
  );

  useEffect(() => {
    if (isInView) router.prefetch(editUrl);
  }, [isInView, editUrl]);

  return (
    <>
      <CardList.Card
        key={link.id}
        onClick={
          !isMobile
            ? (e) => {
                if (e.metaKey || e.ctrlKey) window.open(editUrl, "_blank");
                else router.push(editUrl);
              }
            : undefined
        }
        onAuxClick={
          !isMobile ? () => window.open(editUrl, "_blank") : undefined
        }
        outerClassName="overflow-hidden"
        innerClassName="p-0"
        {...(variant === "loose" &&
          link.folderId &&
          ![defaultFolderId, searchParams.get("folderId")].includes(
            link.folderId,
          ) && {
            banner: (
              <Link
                href={`/${slug}/links?folderId=${folder?.id}`}
                className="group flex items-center justify-between gap-2 rounded-t-xl border-b border-neutral-100 bg-neutral-50 px-5 py-2 text-xs"
              >
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
                  <ExpandingArrow className="invisible -ml-1.5 size-3.5 text-neutral-500 group-hover:visible" />
                </div>
                <p className="text-neutral-500 underline transition-colors group-hover:text-neutral-800">
                  Open folder
                </p>
              </Link>
            ),
          })}
      >
        <div className="flex items-center gap-5 px-4 py-2.5 text-sm sm:gap-8 md:gap-12">
          <div ref={ref} className="min-w-0 grow">
            <LinkTitleColumn link={link} />
          </div>
          <LinkDetailsColumn link={link} />
        </div>
        <LinkTests link={link} />
      </CardList.Card>
    </>
  );
});
