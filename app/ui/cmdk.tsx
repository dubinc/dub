"use client";

import { Command, useCommandState } from "cmdk";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Modal from "./modal";
import { ExpandingArrow, Magic } from "./icons";
import { POPULAR_ARTICLES } from "app/dub.sh/help/constants";
import { allHelpPosts } from "contentlayer/generated";
import { useRouter } from "next/navigation";
import { useRouter as usePagesRouter } from "next/router";
import Highlighter from "react-highlight-words";

function CMDKHelper({
  showCMDK,
  setShowCMDK,
}: {
  showCMDK: boolean;
  setShowCMDK: Dispatch<SetStateAction<boolean>>;
}) {
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
        <Command.List className="h-[50vh] max-h-[360px] min-h-[250px] overflow-scroll border-t border-gray-200 p-2 transition-all scrollbar-hide sm:h-[calc(var(--cmdk-list-height)+10rem)]">
          <Command.Empty className="flex items-center space-x-2 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-600">
            <Magic className="h-4 w-4 text-gray-400" />
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium text-purple-600">Ask AI</p>
              <p className="text-xs text-gray-400">
                Use our AI to find answers to your questions
              </p>
            </div>
          </Command.Empty>

          <CommandResults setShowCMDK={setShowCMDK} />
        </Command.List>
      </Command>
    </Modal>
  );
}

const CommandResults = ({
  setShowCMDK,
}: {
  setShowCMDK: Dispatch<SetStateAction<boolean>>;
}) => {
  let router;
  try {
    router = useRouter();
  } catch (e) {
    router = usePagesRouter();
  }

  const popularArticles = POPULAR_ARTICLES.map(
    (slug) => allHelpPosts.find((post) => post.slug === slug)!,
  );

  const search = useCommandState((state) => state.search);

  return (search.length === 0 ? popularArticles : allHelpPosts).map(
    (article) => (
      <Command.Item
        key={article.slug}
        value={article.title}
        onSelect={() => {
          router.push(`/help/article/${article.slug}`);
          setShowCMDK(false);
        }}
        className="group flex cursor-pointer items-center justify-between space-x-2 rounded-md px-4 py-2 hover:bg-gray-100 active:bg-gray-200 aria-selected:bg-gray-100"
      >
        <div className="flex flex-col space-y-1">
          <Highlighter
            highlightClassName="underline bg-transparent text-purple-500"
            searchWords={[search]}
            autoEscape={true}
            textToHighlight={article.title}
            className="text-sm font-medium text-gray-600 group-aria-selected:text-purple-600 sm:group-hover:text-purple-600"
          />
          <Highlighter
            highlightClassName="underline bg-transparent text-purple-500"
            searchWords={[search]}
            autoEscape={true}
            textToHighlight={article.summary}
            className="text-xs text-gray-400"
          />
        </div>
        <ExpandingArrow className="invisible -ml-4 h-4 w-4 text-purple-600 group-aria-selected:visible sm:group-hover:visible" />
      </Command.Item>
    ),
  );
};

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
