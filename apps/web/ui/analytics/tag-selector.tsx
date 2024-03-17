import useTags from "@/lib/swr/use-tags";
import { IconMenu, Popover, Tick, useRouterStuff } from "@dub/ui";
import { Command } from "cmdk";
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

  return tags && tags.length > 0 ? (
    <Popover
      content={
        <Command className="w-full md:w-48">
          <div className="grid w-full p-2 md:w-48">
            {tags.length > 4 && (
              <div className="relative mb-2">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Command.Input
                  value={filterValue}
                  autoFocus
                  onValueChange={(search: string) => setFilterValue(search)}
                  placeholder="Filter tags"
                  className="w-full rounded-md border border-gray-300 py-1.5 pl-9 text-black placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0 focus:ring-gray-600 sm:text-sm"
                />
              </div>
            )}
            <Command.List className="dub-scrollbar max-h-96 overflow-y-auto">
              {/* All tags selection should be shown all the time */}
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
                {!selectedTagId && (
                  <Tick className="h-4 w-4" aria-hidden="true" />
                )}
              </Link>
              {tags
                .filter((tag) =>
                  tag.name.toLowerCase().includes(filterValue.toLowerCase()),
                )
                .map((tag) => (
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
            </Command.List>
          </div>
        </Command>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={(o) => setOpenPopover(!o)}
        className="flex w-full items-center justify-between space-x-2 truncate rounded-md bg-white px-3 py-2.5 shadow transition-all hover:shadow-md md:w-48"
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
