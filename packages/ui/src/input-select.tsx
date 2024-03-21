import { Command, useCommandState } from "cmdk";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  Dispatch,
  InputHTMLAttributes,
  ReactNode,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Badge } from "./badge";

export interface InputSelectItemProps {
  id: string;
  value: string;
  image: string;
  disabled?: boolean;
  label?: string;
}

export function InputSelect({
  items,
  selectedItem,
  setSelectedItem,
  icon,
  inputAttrs,
}: {
  items: InputSelectItemProps[];
  selectedItem: InputSelectItemProps | null;
  setSelectedItem: Dispatch<SetStateAction<InputSelectItemProps | null>>;
  icon?: ReactNode;
  inputAttrs?: InputHTMLAttributes<HTMLInputElement>;
}) {
  const commandRef = useRef<HTMLDivElement | null>(null);
  const [openCommandList, setOpenCommandList] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(e.target as Node)
      ) {
        setOpenCommandList(false);
      }
    };
    if (openCommandList) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [commandRef, openCommandList]);

  const CommandInput = () => {
    const isEmpty = useCommandState((state: any) => state.filtered.count === 0);
    return (
      <Command.Input
        placeholder={inputAttrs?.placeholder || "Search..."}
        // hack to focus on the input when the dropdown opens
        autoFocus={openCommandList}
        // when focus on the input. only show the dropdown if there are tags and the tagValue is not empty
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
        className="block w-full rounded-md border-none px-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
      />
    );
  };

  return (
    <Command ref={commandRef} className="relative w-full" loop>
      <div className="group rounded-md border border-gray-300 bg-white px-1 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
        <div className="absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-gray-400">
          {selectedItem ? (
            <img
              src={selectedItem.image}
              alt={selectedItem.value}
              className="h-4 w-4 rounded-full"
            />
          ) : (
            icon || <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <div className="flex h-9 px-8">
          <CommandInput />
          {inputValue ? (
            <button
              onClick={() => {
                setSelectedItem(null);
                setInputValue("");
              }}
              className="absolute inset-y-0 right-0 my-auto"
            >
              <X className="h-7 w-7 pr-3 text-gray-400" />
            </button>
          ) : (
            <ChevronDown className="absolute inset-y-0 right-0 my-auto h-7 w-7 pr-3 text-gray-400 transition-all" />
          )}
        </div>
      </div>
      {openCommandList && (
        <Command.List className="absolute z-20 mt-2 h-[calc(var(--cmdk-list-height)+17px)] max-h-[300px] w-full overflow-auto rounded-md border border-gray-200 bg-white p-2 shadow-md transition-all">
          <Command.Empty className="px-4 py-2 text-sm text-gray-600">
            No results found for "{inputValue}"
          </Command.Empty>
          {items.map((item) => (
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
                <img
                  src={item.image}
                  alt={item.value}
                  className="h-4 w-4 rounded-full"
                />
                <p>{item.value}</p>
                {item.label && (
                  <Badge className="text-xs" variant="neutral">
                    {item.label}
                  </Badge>
                )}
              </div>
              <Check className="invisible h-5 w-5 text-gray-500 aria-selected:visible" />
            </Command.Item>
          ))}
        </Command.List>
      )}
    </Command>
  );
}
