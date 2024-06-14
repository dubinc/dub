import {
  AnimatedSizeContainer,
  Popover,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { Gear, Globe, Hyperlink } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { RefObject, useEffect, useState } from "react";

const linkTypes = [
  {
    id: "root",
    label: "Root domains",
    icon: Globe,
  },
  {
    id: "link",
    label: "Short links",
    icon: Hyperlink,
  },
];

export default function EventsLinkType({
  scrollContainer,
}: {
  scrollContainer: RefObject<Element>;
}) {
  const { isMobile } = useMediaQuery();

  const [isOpen, setIsOpen] = useState(false);

  const searchParams = useSearchParams();
  const root = searchParams.get("root");

  const [selectedLinkTypes, setSelectedLinkTypes] = useState<"root" | "link">(
    "link",
  );

  useEffect(() => {
    if (root === "true") {
      setSelectedLinkTypes("root");
    } else {
      setSelectedLinkTypes("link");
    }
  }, [root]);

  const { queryParams } = useRouterStuff();

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      collisionBoundary={scrollContainer.current ?? undefined}
      sticky="always"
      content={
        <AnimatedSizeContainer
          width={!isMobile}
          height
          className="rounded-[inherit]"
          style={{ transform: "translateZ(0)" }} // Fixes overflow on some browsers
        >
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1 text-sm sm:w-auto sm:min-w-[180px]">
              {linkTypes.map(({ id, label, icon: Icon }) => (
                <Command.Item
                  key={id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2",
                    "data-[selected=true]:bg-gray-100",
                  )}
                  onSelect={() => {
                    queryParams({
                      ...(id === "root"
                        ? {
                            set: {
                              root: "true",
                            },
                          }
                        : {
                            del: "root",
                          }),
                    });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                  {selectedLinkTypes.includes(id) && (
                    <Check className="h-4 w-4" />
                  )}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </AnimatedSizeContainer>
      }
      align="end"
    >
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 active:text-gray-950"
      >
        <Gear className="h-4 w-4" />
      </button>
    </Popover>
  );
}
