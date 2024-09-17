import { FolderProps } from "@/lib/types";
import { CardList, useMediaQuery } from "@dub/ui";
import { FolderInfo } from "./folder-info";

export const FolderCard = ({
  folder,
  linksCount,
}: {
  folder: FolderProps;
  linksCount: number;
}) => {
  const { isMobile } = useMediaQuery();

  return (
    <>
      <CardList.Card
        key={folder.id}
        onClick={isMobile ? undefined : () => () => {}}
        innerClassName="flex items-center gap-5 sm:gap-8 md:gap-12 text-sm"
      >
        <div className="min-w-0 grow">
          <FolderInfo folder={folder} linksCount={linksCount} />
        </div>
      </CardList.Card>
    </>
  );
};
