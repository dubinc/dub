import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  Check2,
  Plus,
  Popover,
  useScrollProgress,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import {
  createContext,
  forwardRef,
  HTMLProps,
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuid } from "uuid";

export const InlineBadgePopoverContext = createContext<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function InlineBadgePopover({
  text,
  invalid,
  children,
  buttonClassName,
}: PropsWithChildren<{
  text: ReactNode;
  invalid?: boolean;
  buttonClassName?: string;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      align="start"
      content={
        <InlineBadgePopoverContext.Provider value={{ isOpen, setIsOpen }}>
          <div className="w-full min-w-32 p-1 text-sm sm:w-auto">
            {children}
          </div>
        </InlineBadgePopoverContext.Provider>
      }
      onWheel={(e) => {
        // Allows scrolling to work when the popover's in a modal/sheet
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        className={cn(
          "inline-block rounded px-1.5 text-sm font-semibold transition-colors",
          invalid
            ? "bg-orange-50 text-orange-500 hover:bg-orange-100 data-[state=open]:bg-orange-100"
            : "bg-blue-50 text-blue-700 hover:bg-blue-100 data-[state=open]:bg-blue-100",
          buttonClassName,
        )}
      >
        {text}
      </button>
    </Popover>
  );
}

type MenuItem<T> = {
  icon?: ReactNode;
  text: string;
  value: T;
  onSelect?: () => void;
};

export function InlineBadgePopoverMenu<T extends any>({
  items,
  onSelect,
  selectedValue,
  search,
}: {
  items: MenuItem<T>[];
  onSelect?: (value: T) => void;
  selectedValue?: T | T[];
  search?: boolean;
}) {
  const isMultiSelect = Array.isArray(selectedValue);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const [sortedItems, setSortedItems] = useState<MenuItem<T>[]>(items);

  // Sort items so that the selected values are always at the top
  useEffect(() => {
    setSortedItems(
      items.sort((a, b) => {
        const aSelected = isMultiSelect
          ? selectedValue?.includes(a.value)
          : selectedValue === a.value;
        const bSelected = isMultiSelect
          ? selectedValue?.includes(b.value)
          : selectedValue === b.value;

        // First sort by whether the items are selected
        if (aSelected !== bSelected) return aSelected ? -1 : 1;

        // Then sort as per the original order of the items
        return items.indexOf(a) - items.indexOf(b);
      }),
    );
  }, [items, isMultiSelect, selectedValue]);

  return (
    <Command loop className="focus:outline-none">
      {search && (
        <div className="-mx-1 -mt-1 mb-1 flex items-center overflow-hidden rounded-t-lg border-b border-neutral-200">
          <Command.Input
            placeholder="Search"
            className="border-0 bg-transparent py-2 pl-4 pr-2 outline-none placeholder:text-neutral-400 focus:ring-0 sm:text-sm"
          />
        </div>
      )}
      <AnimatedSizeContainer height>
        <div className="relative">
          <Command.List
            className="scrollbar-hide flex max-h-64 max-w-52 flex-col gap-1 overflow-y-auto transition-all"
            ref={scrollRef}
            onScroll={updateScrollProgress}
          >
            {sortedItems.map(
              ({ icon, text, value, onSelect: itemOnSelect }) => (
                <Command.Item
                  key={text}
                  value={`${text} ${value}`}
                  onSelect={() => {
                    itemOnSelect?.();
                    onSelect?.(value);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 transition-colors duration-150 data-[selected=true]:bg-neutral-100"
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-content-default pr-3 text-left text-sm font-medium">
                      {text}
                    </span>
                  </div>
                  {(Array.isArray(selectedValue)
                    ? selectedValue.includes(value)
                    : selectedValue === value) && (
                    <Check2 className="text-content-emphasis size-3.5 shrink-0" />
                  )}
                </Command.Item>
              ),
            )}
          </Command.List>
          <div
            className="pointer-events-none absolute bottom-0 left-0 hidden h-12 w-full rounded-b-lg bg-gradient-to-t from-white sm:block"
            style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
          />
        </div>
      </AnimatedSizeContainer>
    </Command>
  );
}

export const InlineBadgePopoverInput = forwardRef<HTMLInputElement>(
  (props: HTMLProps<HTMLInputElement>, ref) => {
    const { setIsOpen } = useContext(InlineBadgePopoverContext);

    return (
      <div className="relative rounded-md shadow-sm">
        <input
          ref={ref}
          className={cn(
            "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 sm:w-32 sm:text-sm",
            "focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setIsOpen(false);
            }
          }}
          {...props}
        />
      </div>
    );
  },
);

export const InlineBadgePopoverInputs = ({
  values: valuesProp,
  onChange,
  inputProps,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  inputProps?: HTMLProps<HTMLInputElement>;
}) => {
  const [values, setValues] = useState<{ id: string; value: string }[]>(() =>
    valuesProp.map((value) => ({ id: uuid(), value })),
  );

  // Kinda nasty but allows the component to only receive/return the values array without needing external IDs
  useEffect(() => {
    const currentValues = values.map(({ value }) => value);
    if (JSON.stringify(currentValues) !== JSON.stringify(valuesProp)) {
      // Values have changed: generate new IDs
      setValues(valuesProp.map((value) => ({ id: uuid(), value })));
    }
  }, [valuesProp, values]);

  const handleUpdate = (id: string, newValue: string) => {
    const updatedValues = values.map((item) =>
      item.id === id ? { ...item, value: newValue } : item,
    );
    setValues(updatedValues);
    onChange(updatedValues.map(({ value }) => value));
  };

  const handleDelete = (id: string) => {
    const updatedValues = values.filter((item) => item.id !== id);
    setValues(updatedValues);
    onChange(updatedValues.map((item) => item.value));
  };

  const handleAppend = () => {
    const newItem = { id: uuid(), value: "" };
    const updatedValues = [...values, newItem];
    setValues(updatedValues);
    onChange(updatedValues.map((item) => item.value));
  };

  return (
    <div className="flex flex-col gap-1">
      {values.map(({ id, value }, index) => (
        <div className="flex items-center gap-1" key={id}>
          <input
            className={cn(
              "relative block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 shadow-sm sm:w-32 sm:text-sm",
              "focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
            )}
            value={value}
            onChange={(e) => handleUpdate(id, e.target.value)}
            autoFocus={index === values.length - 1}
            {...inputProps}
          />
          {values.length > 1 && (
            <Button
              variant="outline"
              className="h-6 w-fit px-1"
              icon={<X className="size-4" />}
              onClick={() => handleDelete(id)}
            />
          )}
        </div>
      ))}
      <Button
        variant="outline"
        className="h-4 w-full px-1"
        icon={<Plus className="size-3" />}
        onClick={handleAppend}
      />
    </div>
  );
};
