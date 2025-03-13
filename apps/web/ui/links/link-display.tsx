import { useIsMegaFolder } from "@/lib/swr/use-is-mega-folder";
import {
  Button,
  Popover,
  Switch,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import {
  ArrowsOppositeDirectionY,
  BoxArchive,
  GridLayoutRows,
  Sliders,
  TableRows2,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useContext, useState } from "react";
import LinkSort from "./link-sort";
import {
  LinksDisplayContext,
  LinksViewMode,
  linkDisplayProperties,
} from "./links-display-provider";

export default function LinkDisplay() {
  const {
    viewMode,
    setViewMode,
    showArchived,
    setShowArchived,
    displayProperties,
    setDisplayProperties,
    isDirty,
    persist,
    reset,
  } = useContext(LinksDisplayContext);

  const { isMegaFolder } = useIsMegaFolder();

  const [openPopover, setOpenPopover] = useState(false);
  const { queryParams } = useRouterStuff();

  useKeyboardShortcut("a", () => setShowArchived((o) => !o), {
    enabled: !isMegaFolder,
  });

  return (
    <Popover
      content={
        <div className="w-full divide-y divide-neutral-200 text-sm md:w-80">
          <div className="grid grid-cols-2 gap-2 p-3">
            {[
              { id: "cards", label: "Cards", icon: GridLayoutRows },
              { id: "rows", label: "Rows", icon: TableRows2 },
            ].map(({ id, label, icon: Icon }) => {
              const selected = viewMode === id;
              return (
                <button
                  key={id}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-md border border-transparent transition-colors",
                    selected
                      ? "border-neutral-300 bg-neutral-100 text-neutral-950"
                      : "text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950",
                  )}
                  onClick={() => setViewMode(id as LinksViewMode)}
                  aria-pressed={selected}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 text-neutral-600",
                      selected && "text-neutral-800",
                    )}
                  />
                  {label}
                </button>
              );
            })}
          </div>
          {!isMegaFolder && (
            <div className="flex h-16 items-center justify-between gap-2 px-4">
              <span className="flex items-center gap-2">
                <ArrowsOppositeDirectionY className="h-4 w-4 text-neutral-800" />
                Ordering
              </span>
              <div>
                <LinkSort />
              </div>
            </div>
          )}
          {!isMegaFolder && (
            <div className="group flex h-16 items-center justify-between gap-2 px-4">
              <div className="flex items-center gap-2">
                <div className="flex w-6 items-center justify-center">
                  <BoxArchive className="size-4 text-neutral-800 group-hover:hidden" />
                  <kbd className="hidden rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-light text-neutral-500 group-hover:block">
                    A
                  </kbd>
                </div>
                Show archived links
              </div>
              <div>
                <Switch
                  checked={showArchived}
                  fn={(checked) => {
                    setShowArchived(checked);
                    queryParams({
                      del: [
                        "showArchived", // Remove legacy query param
                        "page", // Reset pagination
                      ],
                    });
                  }}
                />
              </div>
            </div>
          )}
          <div className="p-4">
            <span className="text-xs uppercase text-neutral-500">
              Display Properties
            </span>
            <div className="mt-4 flex flex-wrap gap-2">
              {linkDisplayProperties.map((property) => {
                const active = displayProperties.includes(property.id);
                return (
                  <button
                    key={property.id}
                    aria-pressed={active}
                    onClick={() => {
                      let newDisplayProperties = active
                        ? displayProperties.filter((p) => p !== property.id)
                        : [...displayProperties, property.id];

                      if (property.switch) {
                        // Toggle switched property
                        newDisplayProperties = [
                          ...newDisplayProperties.filter(
                            (p) => p !== property.switch,
                          ),
                          ...(active ? [property.switch] : []),
                        ];
                      }

                      setDisplayProperties(newDisplayProperties);
                    }}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-sm",
                      property.mobile === false && "hidden sm:block",
                      active
                        ? "border-neutral-300 bg-neutral-100 text-neutral-950"
                        : "border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
                    )}
                  >
                    {property.label}
                  </button>
                );
              })}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {isDirty && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-end gap-2 p-2">
                  <Button
                    className="h-8 w-auto px-2"
                    variant="outline"
                    text="Reset to default"
                    onClick={reset}
                  />
                  <Button
                    className="h-8 w-auto px-2"
                    variant="primary"
                    text="Set as default"
                    onClick={persist}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="secondary"
        className="hover:bg-white [&>div]:w-full"
        textWrapperClassName="!overflow-visible"
        text={
          <div className="flex w-full items-center gap-2">
            <div className="relative shrink-0">
              <Sliders className="h-4 w-4" />
              {isDirty && (
                <div className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-blue-500">
                  <div className="h-full w-full animate-pulse rounded-full ring-2 ring-blue-500/40" />
                </div>
              )}
            </div>
            <span className="grow text-left">Display</span>
            <ChevronDown
              className={cn("h-4 w-4 text-neutral-400 transition-transform", {
                "rotate-180": openPopover,
              })}
            />
          </div>
        }
      />
    </Popover>
  );
}
