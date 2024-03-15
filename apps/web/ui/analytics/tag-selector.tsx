import useTags from "@/lib/swr/use-tags";
import { IconMenu, Popover, Tick, useRouterStuff } from "@dub/ui";
import { ChevronDown, Search, Tag } from "lucide-react";
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
  const [filterValue, setFilterValue] = useState("");

  // filter the tags through the search input
  const filteredTags = tags
    ? tags!.filter((tag) =>
        tag.name.toLowerCase().includes(filterValue.toLowerCase()),
      )
    : [];

  return tags && tags.length > 0 ? (
    <Popover
      content={
        <div className="grid w-full p-2 md:w-48">
          {tags.length > 10 && (
            <div className="relative mb-2">
              <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 text-black placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-gray-600 sm:text-sm"
                placeholder="Filter tags..."
              />
            </div>
          )}
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
          {filteredTags.map((tag) => (
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
