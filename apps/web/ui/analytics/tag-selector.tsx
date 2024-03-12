import useTags from "@/lib/swr/use-tags";
import { IconMenu, Popover, Tick, useRouterStuff } from "@dub/ui";
import { ChevronDown, Tag } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import TagBadge from "../links/tag-badge";

export default function TagSelector() {
  const { queryParams } = useRouterStuff();

  const { tags } = useTags();
  const searchParams = useSearchParams();
  const selectedTagId = searchParams?.get("tagId");

  const [openPopover, setOpenPopover] = useState(false);

  return tags && tags.length > 0 ? (
    <Popover
      content={
        <div className="grid w-full p-2 md:w-48">
          <Link
            href={
              queryParams({
                del: "tagId",
                getNewPath: true,
              }) as string
            }
            className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
          >
            <p className="text-sm">All tags</p>
            {!selectedTagId && <Tick className="h-4 w-4" aria-hidden="true" />}
          </Link>
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={
                queryParams({
                  set: { tagId: tag.id },
                  getNewPath: true,
                }) as string
              }
              className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
            >
              <TagBadge {...tag} />
              {selectedTagId === tag.id && (
                <Tick className="h-4 w-4" aria-hidden="true" />
              )}
            </Link>
          ))}
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={(o) => setOpenPopover(!o)}
        className="flex w-full items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all hover:shadow-md md:w-48"
      >
        <IconMenu
          text={tags.find(({ id }) => id === selectedTagId)?.name || "All tags"}
          icon={<Tag className="h-4 w-4" />}
        />
        <ChevronDown
          className={`h-5 w-5 text-gray-400 ${
            openPopover ? "rotate-180 transform" : ""
          } transition-all duration-75`}
        />
      </button>
    </Popover>
  ) : undefined;
}
