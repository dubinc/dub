"use client";

import { Command } from "cmdk";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Modal from "./modal";
import { Magic } from "./icons";
import { Book } from "lucide-react";

function CMDKHelper({
  showCMDK,
  setShowCMDK,
}: {
  showCMDK: boolean;
  setShowCMDK: Dispatch<SetStateAction<boolean>>;
}) {
  const items = ["Getting Started", "Guides", "API Reference", "Examples"];
  return (
    <Modal showModal={showCMDK} setShowModal={setShowCMDK}>
      <Command
        label="CMDK"
        className="w-full overflow-hidden bg-white shadow-xl sm:max-w-xl sm:rounded-xl sm:border sm:border-gray-200"
        loop
      >
        <Command.Input
          autoFocus
          placeholder="Search articles, guides, and more..."
          className="w-full border-none p-4 font-normal placeholder-gray-400 focus:outline-none focus:ring-0"
        />
        <Command.List className="border-t border-gray-200 p-2 transition-all sm:h-[calc(var(--cmdk-list-height)+10rem)] sm:max-h-[300px]">
          <Command.Empty className="flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-600">
            <Magic className="h-4 w-4 text-gray-400" />
            <p>Ask AI</p>
          </Command.Empty>

          {items.map((item) => (
            <Command.Item
              key={item}
              value={item}
              onSelect={() => {
                console.log("selected", item);
              }}
              className="flex cursor-pointer items-center space-x-2 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 aria-selected:bg-gray-100 aria-selected:text-gray-700"
            >
              <Book className="h-4 w-4 text-gray-400" />
              <p>{item}</p>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </Modal>
  );
}

export default function useCMDK() {
  const [showCMDK, setShowCMDK] = useState(false);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCMDK((showCMDK) => !showCMDK);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const CMDK = useCallback(() => {
    return <CMDKHelper showCMDK={showCMDK} setShowCMDK={setShowCMDK} />;
  }, [showCMDK, setShowCMDK]);

  return useMemo(
    () => ({ showCMDK, setShowCMDK, CMDK }),
    [showCMDK, setShowCMDK, CMDK],
  );
}
