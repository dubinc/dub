import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { CircleXmark, Magnifier } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce";

type SearchBoxProps = {
  value: string;
  loading?: boolean;
  showClearButton?: boolean;
  onChange: (value: string) => void;
  onChangeDebounced?: (value: string) => void;
  debounceTimeoutMs?: number;
  inputClassName?: string;
};

export const SearchBox = forwardRef(
  (
    {
      value,
      loading,
      showClearButton = true,
      onChange,
      onChangeDebounced,
      debounceTimeoutMs = 500,
      inputClassName,
    }: SearchBoxProps,
    forwardedRef,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => inputRef.current);

    const debounced = useDebouncedCallback(
      (value) => onChangeDebounced?.(value),
      debounceTimeoutMs,
    );

    const onKeyDown = useCallback((e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // only focus on filter input when:
      // - user is not typing in an input or textarea
      // - there is no existing modal backdrop (i.e. no other modal is open)
      if (
        e.key === "/" &&
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }, []);

    useEffect(() => {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [onKeyDown]);

    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {loading && value.length > 0 ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <Magnifier className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          className={cn(
            "peer w-full rounded-md border border-gray-200 px-10 text-sm text-black placeholder:text-gray-400 focus:border-black focus:ring-0",
            inputClassName,
          )}
          placeholder="Search..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            debounced(e.target.value);
          }}
        />
        {showClearButton && value.length > 0 && (
          <button
            onClick={() => {
              onChange("");
              onChangeDebounced?.("");
            }}
            className="pointer-events-auto absolute inset-y-0 right-0 flex items-center pr-4"
          >
            <CircleXmark className="h-4 w-4 text-gray-600" />
          </button>
        )}
      </div>
    );
  },
);

export function SearchBoxPersisted({
  urlParam = "search",
  ...props
}: { urlParam?: string } & Partial<SearchBoxProps>) {
  const { queryParams, searchParams } = useRouterStuff();

  const [value, setValue] = useState(searchParams.get(urlParam) ?? "");
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Set URL param when debounced value changes
  useEffect(() => {
    if (searchParams.get(urlParam) ?? "" !== debouncedValue)
      queryParams(
        debouncedValue === ""
          ? { del: urlParam }
          : { set: { search: debouncedValue } },
      );
  }, [debouncedValue]);

  // Set value when URL param changes
  useEffect(() => {
    const search = searchParams.get(urlParam);
    if (search ?? "" !== value) setValue(search ?? "");
  }, [searchParams.get(urlParam)]);

  return (
    <SearchBox
      value={value}
      onChange={setValue}
      onChangeDebounced={setDebouncedValue}
      {...props}
    />
  );
}
