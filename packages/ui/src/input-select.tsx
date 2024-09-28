import { cn } from "@dub/utils";
import {
  flip,
  offset,
  size,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { Command, useCommandState } from "cmdk";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  Dispatch,
  InputHTMLAttributes,
  ReactNode,
  SetStateAction,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Drawer } from "vaul";
import { Badge } from "./badge";
import { BlurImage } from "./blur-image";
import { useMediaQuery } from "./hooks";
import { useScrollProgress } from "./hooks/use-scroll-progress";

const InputSelectContext = createContext<{
  inputAttrs: InputHTMLAttributes<HTMLInputElement>;
  openCommandList: boolean;
  setOpenCommandList: Dispatch<SetStateAction<boolean>>;
  inputValue: string;
  setInputValue: Dispatch<SetStateAction<string>>;
  disabled: boolean;
  selectedItem: InputSelectItemProps | null;
  setSelectedItem: Dispatch<SetStateAction<InputSelectItemProps | null>>;
}>({
  inputAttrs: {},
  openCommandList: false,
  setOpenCommandList: () => {},
  inputValue: "",
  setInputValue: () => {},
  disabled: false,
  selectedItem: null,
  setSelectedItem: () => {},
});

export interface InputSelectItemProps {
  id: string;
  value: string;
  color?: string;
  image?: string;
  disabled?: boolean;
  label?: string;
}

export function InputSelect({
  items,
  selectedItem,
  setSelectedItem,
  className,
  disabled,
  adjustForMobile,
  icon,
  inputAttrs,
  noItemsElement,
}: {
  items: InputSelectItemProps[] | [];
  selectedItem: InputSelectItemProps | null;
  setSelectedItem: Dispatch<SetStateAction<InputSelectItemProps | null>>;
  className?: string;
  disabled?: boolean;
  adjustForMobile?: boolean;
  icon?: ReactNode;
  inputAttrs?: InputHTMLAttributes<HTMLInputElement>;
  noItemsElement?: ReactNode;
}) {
  const commandRef = useRef<HTMLDivElement | null>(null);
  const [openCommandList, setOpenCommandList] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Whether the input has changed since opening
  const [inputChanged, setInputChanged] = useState(false);

  useEffect(() => {
    // Reset inputChanged when the command list is opened
    if (openCommandList) setInputChanged(false);
  }, [openCommandList]);

  useEffect(() => setInputChanged(true), [inputValue]);

  useEffect(() => {
    if (selectedItem) setInputValue(selectedItem.value);
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    const search = inputValue.toLowerCase();

    return inputChanged
      ? // Filter the items
        items.filter((item: InputSelectItemProps) =>
          item.value.toLowerCase().includes(search),
        )
      : inputValue
        ? // Just sort the items instead of filtering
          items.sort(
            (a, b) =>
              (b.value.toLowerCase().includes(search) ? 1 : 0) -
              (a.value.toLowerCase().includes(search) ? 1 : 0),
          )
        : items;
  }, [inputChanged, inputValue, items]);

  const {
    refs: floatingRefs,
    floatingStyles,
    context,
  } = useFloating({
    open: openCommandList,
    onOpenChange: setOpenCommandList,
    middleware: [
      offset(8),
      size({
        apply({ elements: { floating }, availableHeight }) {
          Object.assign(floating.style, {
            // Minimum height before 'flip' takes over is 112px
            maxHeight: `${Math.max(75, Math.min(availableHeight, 290))}px`,
          });
        },
        padding: 8,
      }),
      flip({
        fallbackStrategy: "initialPlacement",
        padding: 8,
      }),
    ],
  });

  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const { isMobile } = useMediaQuery();

  return (
    <InputSelectContext.Provider
      value={{
        inputAttrs: inputAttrs || {},
        openCommandList,
        setOpenCommandList,
        inputValue,
        setInputValue,
        disabled: Boolean(disabled),
        selectedItem,
        setSelectedItem,
      }}
    >
      {isMobile && adjustForMobile ? (
        // when adjustForMobile is true, render the input as a drawer
        <Drawer.Root open={openCommandList} onOpenChange={setOpenCommandList}>
          <Drawer.Trigger className="sm:hidden" asChild>
            <Command
              ref={commandRef}
              className="relative"
              shouldFilter={false}
              loop
            >
              <div
                className={cn(
                  "group relative rounded-md border border-gray-300 bg-white px-1 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500 md:min-w-[140px]",
                  className,
                )}
              >
                <div className="absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-gray-400">
                  {selectedItem && selectedItem.image ? (
                    <img
                      src={selectedItem.image}
                      alt={selectedItem.value}
                      className="h-4 w-4 rounded-full"
                    />
                  ) : (
                    icon || <Search className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex h-10 px-8">
                  <CommandInput />
                  <CloseChevron />
                </div>
              </div>
            </Command>
          </Drawer.Trigger>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-gray-100 bg-opacity-10 backdrop-blur" />
          <Drawer.Portal>
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-lg border-t border-gray-200 bg-white">
              <Command
                ref={commandRef}
                className="relative"
                shouldFilter={false}
                loop
              >
                <div
                  className={cn(
                    "group relative mb-2 rounded-t-md border-b border-gray-300 bg-white p-1 sm:border sm:py-0 sm:focus-within:border-gray-500 sm:focus-within:ring-1 sm:focus-within:ring-gray-200",
                    className,
                  )}
                >
                  <div className="absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-gray-400">
                    {selectedItem && selectedItem.image ? (
                      <img
                        src={selectedItem.image}
                        alt={selectedItem.value}
                        className="h-4 w-4 rounded-full"
                      />
                    ) : (
                      icon || <Search className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex h-10 px-8">
                    <CommandInput />
                    <CloseChevron />
                  </div>
                </div>
                {openCommandList && (
                  <Command.List className="dub-scrollbar h-[70vh] overflow-y-auto p-2">
                    {items.length === 0 &&
                      inputValue === "" &&
                      (noItemsElement ? (
                        <div>{noItemsElement}</div>
                      ) : (
                        <p className="px-4 py-2 text-sm text-gray-600">
                          No items found.
                        </p>
                      ))}
                    {inputValue !== "" && (
                      <Command.Empty className="px-4 py-2 text-sm text-gray-600">
                        No results found.
                      </Command.Empty>
                    )}
                    <SelectorList items={filteredItems} />
                  </Command.List>
                )}
              </Command>
            </Drawer.Content>
            <Drawer.Overlay />
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <Command
          ref={commandRef}
          className="relative"
          shouldFilter={false}
          loop
        >
          <div
            className={cn(
              "group rounded-md border border-gray-200 bg-white px-1 transition-all focus-within:border-gray-500 focus-within:ring-4 focus-within:ring-gray-200",
              className,
            )}
          >
            <div
              onClick={() => setOpenCommandList((prev) => !prev)}
              className="absolute inset-y-0 left-0 flex cursor-pointer items-center justify-center pl-3 text-gray-400"
            >
              {selectedItem && selectedItem.image ? (
                <img
                  src={selectedItem.image}
                  alt={selectedItem.value}
                  className="h-4 w-4 rounded-full"
                />
              ) : (
                icon || <Search className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex h-10 px-8">
              <CommandInput
                ref={floatingRefs.setReference}
                {...getReferenceProps()}
              />
              <CloseChevron />
            </div>
          </div>
          {openCommandList && (
            <div
              ref={floatingRefs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-20 flex w-full min-w-[160px] flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-md"
            >
              <div
                ref={scrollRef}
                onScroll={updateScrollProgress}
                className="grow overflow-y-auto p-2"
              >
                <Command.List>
                  {items.length === 0 &&
                    inputValue === "" &&
                    (noItemsElement ? (
                      <div>{noItemsElement}</div>
                    ) : (
                      <p className="px-4 py-2 text-sm text-gray-600">
                        No items found.
                      </p>
                    ))}
                  {inputValue !== "" && (
                    <Command.Empty className="px-4 py-2 text-sm text-gray-600">
                      No results found.
                    </Command.Empty>
                  )}
                </Command.List>
                <SelectorList items={filteredItems} />
              </div>

              {/* Bottom scroll fade */}
              <div
                className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
                style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
              />
            </div>
          )}
        </Command>
      )}
    </InputSelectContext.Provider>
  );
}

const CommandInput = forwardRef<HTMLInputElement>((_, ref) => {
  const isEmpty = useCommandState((state: any) => state.filtered.count === 0);

  const {
    inputAttrs,
    openCommandList,
    setOpenCommandList,
    inputValue,
    setInputValue,
    disabled,
  } = useContext(InputSelectContext);

  return (
    <Command.Input
      ref={ref}
      placeholder={inputAttrs?.placeholder || "Search..."}
      // hacky focus on the input when the dropdown opens
      autoFocus={openCommandList}
      onFocus={() => setOpenCommandList(true)}
      value={inputValue}
      onValueChange={setInputValue}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpenCommandList(false);
          // listen for cases where empty results and enter is pressed
        } else if (e.key === "Enter" && isEmpty) {
          setOpenCommandList(false);
          // if it's a letter or a number and there's no meta key pressed, openCommandList dropdown
        } else if (e.key.match(/^[a-z0-9]$/i) && !e.metaKey) {
          setOpenCommandList(true);
        }
      }}
      disabled={disabled}
      className="block w-full truncate rounded-md border-none px-0 text-base text-gray-900 placeholder-gray-400 outline-none outline-0 transition-all duration-300 focus:ring-0 md:text-sm"
      autoCapitalize="none"
    />
  );
});

function CloseChevron() {
  const {
    setSelectedItem,
    openCommandList,
    setOpenCommandList,
    inputValue,
    setInputValue,
  } = useContext(InputSelectContext);

  return (
    <button
      type="button"
      onClick={() => {
        setOpenCommandList((prev) => !prev);
        setSelectedItem(null);
        setInputValue("");
      }}
      className="absolute inset-y-0 right-0 my-auto pr-3"
    >
      {inputValue.length > 0 ? (
        <X className="h-4 w-4 text-gray-400 transition-all hover:text-gray-700" />
      ) : (
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-all hover:text-gray-700",
            {
              "rotate-180 transform": openCommandList,
            },
          )}
        />
      )}
    </button>
  );
}

function SelectorList({ items }: { items: InputSelectItemProps[] }) {
  const { setSelectedItem, setOpenCommandList, setInputValue } =
    useContext(InputSelectContext);

  return items.map((item) => (
    <Command.Item
      key={item.id}
      value={item.value}
      disabled={item.disabled}
      onSelect={() => {
        setSelectedItem(item);
        setInputValue(item.value);
        setOpenCommandList(false);
      }}
      className="group flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-75 aria-disabled:hover:bg-white aria-selected:bg-gray-100 aria-selected:text-gray-900"
    >
      <div className="flex items-center space-x-2">
        {item.image && (
          <BlurImage
            src={item.image}
            alt={item.value}
            className="h-4 w-4 rounded-full"
            width={16}
            height={16}
          />
        )}
        <p
          className={cn(
            "whitespace-nowrap py-0.5 text-sm",
            item.color && "rounded-md px-2",
            item.color === "red" && "bg-red-100 text-red-600",
            item.color === "yellow" && "bg-yellow-100 text-yellow-600",
            item.color === "green" && "bg-green-100 text-green-600",
            item.color === "blue" && "bg-blue-100 text-blue-600",
            item.color === "purple" && "bg-purple-100 text-purple-600",
            item.color === "brown" && "bg-brown-100 text-brown-600",
          )}
        >
          {item.value}
        </p>
        {item.label && (
          <Badge className="text-xs" variant="neutral">
            {item.label}
          </Badge>
        )}
      </div>

      <Check className="invisible h-5 w-5 text-gray-500 aria-selected:visible" />
    </Command.Item>
  ));
}
