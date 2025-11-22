import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  Check2,
  MarkdownIcon,
  Plus,
  Popover,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  useScrollProgress,
} from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { Command } from "cmdk";
import {
  createContext,
  forwardRef,
  HTMLProps,
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
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
  showOptional,
  disabled,
  children,
  buttonClassName,
  contentClassName,
}: PropsWithChildren<{
  text: ReactNode;
  invalid?: boolean;
  showOptional?: boolean;
  disabled?: boolean;
  buttonClassName?: string;
  contentClassName?: string;
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
        disabled={disabled}
        className={cn(
          "inline-block rounded px-1.5 text-left text-sm font-semibold transition-colors",
          invalid
            ? "bg-orange-50 text-orange-500 hover:bg-orange-100 data-[state=open]:bg-orange-100"
            : showOptional
              ? "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 data-[state=open]:bg-neutral-200"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100 data-[state=open]:bg-blue-100",
          buttonClassName,
        )}
      >
        <span className={contentClassName}>{text}</span>
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
  const { setIsOpen, isOpen } = useContext(InlineBadgePopoverContext);

  const isMultiSelect = Array.isArray(selectedValue);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const sortedItems = useMemo(
    () =>
      items.toSorted((a, b) => {
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
    [items, isMultiSelect, selectedValue],
  );

  const [displayedItems, setDisplayedItems] =
    useState<MenuItem<T>[]>(sortedItems);

  // Update the displayed items to sorted when closed
  useEffect(() => {
    if (!isOpen) setDisplayedItems(sortedItems);
  }, [isOpen, sortedItems]);

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
            {displayedItems.map(
              ({ icon, text, value, onSelect: itemOnSelect }) => (
                <Command.Item
                  key={text}
                  value={`${text} ${value}`}
                  onSelect={() => {
                    itemOnSelect?.();
                    onSelect?.(value);
                    !isMultiSelect && setIsOpen(false);
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

export const InlineBadgePopoverInput = forwardRef<
  HTMLInputElement,
  HTMLProps<HTMLInputElement>
>(({ maxLength, className, ...rest }: HTMLProps<HTMLInputElement>, ref) => {
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  return (
    <label
      className={cn(
        "flex w-full rounded-md border border-neutral-300 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500 sm:w-32",
        className,
      )}
    >
      <input
        ref={ref}
        className={cn(
          "block min-w-0 grow rounded-md border-none px-1.5 py-1 text-neutral-900 placeholder-neutral-400 sm:text-sm",
          "focus:outline-none focus:ring-0",
          maxLength && "pr-0",
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
          }
        }}
        maxLength={maxLength}
        {...rest}
      />
      {maxLength && (
        <span className="relative -ml-4 flex shrink-0 items-center pl-5 pr-1.5 text-xs text-neutral-500">
          <span className="absolute inset-y-0 left-0 block w-4 bg-gradient-to-l from-white" />
          <span>
            {rest.value?.toString().length || 0}/{maxLength}
          </span>
        </span>
      )}
    </label>
  );
});

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

export const InlineBadgePopoverRichTextArea = ({
  value,
  onChange,
  maxLength,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  className?: string;
}) => {
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  return (
    <div>
      <div
        className={cn(
          "w-full rounded-md border border-neutral-300 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500 sm:w-32",
          className,
        )}
      >
        <div>
          <RichTextProvider
            features={["bold", "italic", "links"]}
            style="condensed"
            markdown
            placeholder="Reward tooltip"
            editorClassName="block max-h-24 w-full resize-none border-none overflow-auto scrollbar-hide p-3 text-base sm:text-sm"
            initialValue={value}
            onChange={(editor) => onChange((editor as any).getMarkdown())}
            autoFocus
            editorProps={{
              handleDOMEvents: {
                keydown: (_, e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                    return false;
                  }
                },
              },
            }}
          >
            <RichTextArea />

            <div className="flex items-center justify-between gap-4 px-1 pb-1">
              <RichTextToolbar />
            </div>
          </RichTextProvider>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between px-1">
        {maxLength ? (
          <div className="text-content-subtle mt-1 text-xs">
            {nFormatter(value?.toString().length || 0, { full: true })}/
            {nFormatter(maxLength, { full: true })} characters
          </div>
        ) : (
          <div />
        )}

        <MarkdownIcon className="text-content-default size-4" />
      </div>
    </div>
  );
};
