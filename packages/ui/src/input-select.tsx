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
  HTMLAttributes,
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
  icon?: ReactNode;
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
  const { isMobile } = useMediaQuery();

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
            (a: InputSelectItemProps, b: InputSelectItemProps) =>
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

  const dismiss = useDismiss(context, {
    // useDismiss seems to break the mobile drawer for some reason
    enabled: !isMobile || !adjustForMobile,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const iconElement = useMemo(() => {
    if (selectedItem && selectedItem.icon) return selectedItem.icon;
    if (selectedItem && selectedItem.image)
      return (
        <BlurImage
          src={selectedItem.image}
          alt={selectedItem.value}
          className="size-4 rounded-full"
          width={16}
          height={16}
        />
      );
    return icon || <Search className="size-4 text-neutral-400" />;
  }, [selectedItem, icon]);

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
              <InputGroup className={className} iconElement={iconElement} />
            </Command>
          </Drawer.Trigger>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-neutral-100 bg-opacity-10 backdrop-blur" />
          <Drawer.Portal>
            <Drawer.Content
              className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-lg border-t border-neutral-200 bg-white"
              onPointerDownOutside={(e) => {
                // Prevent dismissal when clicking inside a toast
                if (
                  e.target instanceof Element &&
                  e.target.closest("[data-sonner-toast]")
                ) {
                  e.preventDefault();
                }
              }}
            >
              <Command
                ref={commandRef}
                className="relative"
                shouldFilter={false}
                loop
              >
                <div className="p-2">
                  <InputGroup className={className} iconElement={iconElement} />
                </div>
                {openCommandList && (
                  <Command.List className="dub-scrollbar h-[70vh] overflow-y-auto p-2">
                    {items.length === 0 &&
                      inputValue === "" &&
                      (noItemsElement ? (
                        <div>{noItemsElement}</div>
                      ) : (
                        <p className="px-4 py-2 text-sm text-neutral-600">
                          No items found.
                        </p>
                      ))}
                    {inputValue !== "" && (
                      <Command.Empty className="px-4 py-2 text-sm text-neutral-600">
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
          <InputGroup
            className={className}
            iconElement={iconElement}
            ref={floatingRefs.setReference}
            {...getReferenceProps()}
          />
          {openCommandList && (
            <div
              ref={floatingRefs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-20 flex w-full min-w-[160px] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-md"
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
                      <p className="px-4 py-2 text-sm text-neutral-600">
                        No items found.
                      </p>
                    ))}
                  {inputValue !== "" && (
                    <Command.Empty className="px-4 py-2 text-sm text-neutral-600">
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

type InputGroupProps = {
  iconElement: ReactNode;
} & HTMLAttributes<HTMLLabelElement>;

const InputGroup = forwardRef<HTMLLabelElement, InputGroupProps>(
  ({ iconElement, className, ...rest }: InputGroupProps, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "group relative flex cursor-pointer gap-2 rounded-md border border-neutral-200 bg-white px-1 pl-3 transition-all focus-within:border-neutral-500 focus-within:ring-4 focus-within:ring-neutral-200",
          className,
        )}
        {...rest}
      >
        <div className="flex shrink-0 items-center justify-center text-neutral-400">
          {iconElement}
        </div>
        <div className="flex h-10 grow">
          <CommandInput />
          <CloseChevron />
        </div>
      </label>
    );
  },
);

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
      className="block w-full truncate rounded-md border-none px-0 text-base text-neutral-900 placeholder-neutral-400 outline-none outline-0 transition-all duration-300 focus:ring-0 md:text-sm"
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
        <X className="size-4 text-neutral-400 transition-all hover:text-neutral-700" />
      ) : (
        <ChevronDown
          className={cn(
            "size-4 text-neutral-400 transition-all hover:text-neutral-700",
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
      className="group flex cursor-pointer items-center justify-between rounded-md px-4 py-2 text-sm text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-75 aria-disabled:hover:bg-white aria-selected:bg-neutral-100 aria-selected:text-neutral-900"
    >
      <div className="flex items-center space-x-2">
        {item.icon ||
          (item.image && (
            <BlurImage
              src={item.image}
              alt={item.value}
              className="size-4 rounded-full"
              width={16}
              height={16}
            />
          ))}
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

      <Check className="invisible h-5 w-5 text-neutral-500 aria-selected:visible" />
    </Command.Item>
  ));
}
