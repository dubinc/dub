import useLinksCount from "@/lib/swr/use-links-count";
import { Button } from "@dub/ui";
import { BoxArchive } from "@dub/ui/src/icons";
import { Tooltip } from "@dub/ui/src/tooltip";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { LinksDisplayContext } from "./links-display-provider";

export default function ArchivedLinksHint() {
  const searchParams = useSearchParams();
  const { showArchived } = useContext(LinksDisplayContext);
  // only show the hint if there filters but showArchived is false
  // @ts-ignore – until https://github.com/microsoft/TypeScript/issues/54466 is fixed
  return searchParams.size > 0 && !showArchived && <ArchivedLinksHintHelper />;
}

function ArchivedLinksHintHelper() {
  const { data: count } = useLinksCount<number>();
  const { data: totalCount } = useLinksCount<number>({ showArchived: true });
  const archivedCount = totalCount - count;

  const { setShowArchived } = useContext(LinksDisplayContext);

  return (
    archivedCount > 0 && (
      <Tooltip
        side="top"
        content={
          <div className="px-3 py-2 text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>
                You have{" "}
                <span className="font-medium text-gray-950">
                  {archivedCount}
                </span>{" "}
                archived link{archivedCount !== 1 && "s"} that match
                {archivedCount === 1 && "es"} the applied filters
              </span>
              <div>
                <Button
                  className="h-6 px-2"
                  variant="secondary"
                  text="Show archived links"
                  onClick={() => setShowArchived(true)}
                />
              </div>
            </div>
          </div>
        }
      >
        <div className="flex cursor-default items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-950 hover:bg-gray-200">
          <BoxArchive className="h-3 w-3" />
          {archivedCount}
        </div>
      </Tooltip>
    )
  );
}
