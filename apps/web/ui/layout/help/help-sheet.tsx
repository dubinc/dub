import { Search, X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import {
  BookOpen,
  Calendar6,
  Code,
  Cube,
  Globe2,
  Hyperlink,
} from "@dub/ui/icons";
import Fuse from "fuse.js";
import { Activity, Mail } from "lucide-react";
import posthog from "posthog-js";
import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ContactForm } from "./contact-form";
import { HelpContext } from "./index";

interface HelpSupportSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

interface HelpCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  url?: string;
}

interface FooterItem {
  title: string;
  url?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const guides = [
  {
    name: "Dub Short Links",
    url: "https://dub.co/help/category/link-management",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="24" height="24" rx="6" fill="#FF8904" />
        <path
          d="M12 13V7"
          stroke="#7E2A0C"
          stroke-width="5"
          stroke-linecap="round"
        />
        <path
          d="M12 13L7 16"
          stroke="#7E2A0C"
          stroke-width="5"
          stroke-linecap="round"
        />
        <path
          d="M12 13L17 16"
          stroke="#7E2A0C"
          stroke-width="5"
          stroke-linecap="round"
        />
      </svg>
    ),
  },
  {
    name: "Dub Analytics",
    url: "https://dub.co/help/category/analytics",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="24" height="24" rx="6" fill="#05DF72" />
        <path
          d="M8 14L8 17"
          stroke="#0D542B"
          stroke-width="5"
          stroke-linecap="round"
        />
        <path
          d="M16 7V17"
          stroke="#0D542B"
          stroke-width="5"
          stroke-linecap="round"
        />
      </svg>
    ),
  },
  {
    name: "Custom Domains",
    url: "https://dub.co/help/category/custom-domains",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="24" height="24" rx="6" fill="#A684FF" />
        <circle cx="17.5" cy="12" r="2.5" fill="#4D179A" />
        <circle cx="6.5" cy="12" r="2.5" fill="#4D179A" />
        <circle cx="12" cy="17.5" r="2.5" fill="#4D179A" />
        <circle cx="12" cy="6.5" r="2.5" fill="#4D179A" />
      </svg>
    ),
  },
];

const topics = [
  {
    name: "Topic 1",
    description: "Learn the basics of Dub and how to get started",
    icon: Hyperlink,
    url: "https://dub.co/help/category/link-management",
  },
  {
    name: "Topic 2",
    description: "Learn the basics of Dub and how to get started",
    icon: Cube,
    url: "https://dub.co/help/category/custom-domains",
  },
  {
    name: "Topic 3",
    description: "Learn the basics of Dub and how to get started",
    icon: Globe2,
    url: "https://dub.co/help/category/custom-domains",
  },
];

const footerItems: FooterItem[] = [
  {
    title: "Help documentation",
    url: "https://dub.co/help",
    icon: <BookOpen className="size-4 text-neutral-600" />,
  },
  {
    title: "Contact support",
    icon: <Mail className="size-4 text-neutral-600" />,
  },
  {
    title: "Platform documentation",
    url: "https://dub.co/docs",
    icon: <Code className="size-4 text-neutral-600" />,
  },
  {
    title: "Status",
    url: "http://status.dub.co/",
    icon: <Activity className="size-4 text-neutral-600" />,
  },
  {
    title: "Changelog",
    url: "https://dub.co/changelog",
    icon: <Calendar6 className="size-4 text-neutral-600" />,
  },
];

function useSearchableContent<
  T extends {
    title?: string;
    name?: string;
    summary?: string;
    description?: string;
  },
>(items: T[], searchQuery: string, keys: string[]) {
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys,
        threshold: 0.3,
        includeScore: true,
      }),
    [items, keys],
  );

  return useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    return fuse.search(searchQuery).map((r) => r.item);
  }, [searchQuery, items, fuse]);
}

function HelpSupportSheet({ isOpen, setIsOpen }: HelpSupportSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [screen, setScreen] = useState<"main" | "contact">("main");
  const debouncedTrackSearch = useDebouncedCallback((query: string) => {
    posthog.capture("help_articles_searched", {
      query,
    });
  }, 1000);

  const { popularHelpArticles, allHelpArticles } =
    React.useContext(HelpContext);

  const filteredArticles = useSearchableContent(
    searchQuery ? Array.from(allHelpArticles.values()) : popularHelpArticles,
    searchQuery,
    ["title", "summary"],
  );

  const filteredGuides = useSearchableContent(guides, searchQuery, ["name"]);

  const filteredTopics = useSearchableContent(topics, searchQuery, [
    "name",
    "description",
  ]);

  const hasNoResults =
    searchQuery.length > 0 &&
    filteredArticles.length === 0 &&
    filteredGuides.length === 0 &&
    filteredTopics.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="flex items-start justify-between p-6">
            <Sheet.Title className="text-xl font-semibold">
              Help and support
            </Sheet.Title>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="flex grow flex-col">
          {screen === "main" ? (
            <div className="grow space-y-6 overflow-y-auto p-6">
              <div className="relative h-[48px]">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <Search className="size-5 text-neutral-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    debouncedTrackSearch(e.target.value);
                  }}
                  placeholder="Search articles, guides, and more..."
                  className="h-full w-full rounded-lg border border-neutral-300 bg-white px-4 pl-10 text-sm shadow-sm shadow-black/[0.08] placeholder:text-neutral-500 focus:outline-none focus:ring-0"
                  style={{
                    boxShadow:
                      "0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </div>
              {hasNoResults ? (
                <NoResults searchQuery={searchQuery} setScreen={setScreen} />
              ) : (
                <>
                  <Articles
                    articles={filteredArticles}
                    searchQuery={searchQuery}
                  />
                  <Guides guides={filteredGuides} />
                  <Topics topics={filteredTopics} />
                </>
              )}
            </div>
          ) : (
            <ContactForm setScreen={setScreen} />
          )}
        </div>

        <Footer setScreen={setScreen} />
      </div>
    </Sheet>
  );
}

function HelpCard({ icon, title, description, url, onClick }: HelpCardProps) {
  return (
    <button
      onClick={() => {
        if (url) {
          window.open(url, "_blank");
        } else {
          onClick?.();
        }
      }}
      className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2 text-left transition-all hover:border-neutral-300"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        {icon}
      </div>
      <div className="flex flex-col truncate">
        <h3 className="text-sm font-medium text-neutral-800">{title}</h3>
        {description && (
          <p className="text-xs text-neutral-600">{description}</p>
        )}
      </div>
    </button>
  );
}

function Articles({
  articles,
  searchQuery,
}: {
  articles: any[];
  searchQuery: string;
}) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            {searchQuery.length === 0 ? "Popular Articles" : "Articles"}
          </h2>

          <a
            href="https://dub.co/help"
            className="text-sm font-medium text-neutral-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            View all
          </a>
        </div>

        <div className="mt-4 space-y-3">
          {articles.slice(0, 5).map((article) => (
            <HelpCard
              key={article.title}
              icon={<div className="size-5" />}
              title={article.title}
              description={article.summary}
              onClick={() => {
                posthog.capture("help_article_selected", {
                  query: searchQuery,
                  slug: article.slug,
                });

                window.open(`https://dub.co/help/article/${article.slug}`);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Guides({ guides }: { guides: any[] }) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">Product Guides</h2>
      <div className="mt-4 space-y-3">
        {guides.map((guide) => (
          <HelpCard
            key={guide.name}
            icon={guide.icon}
            title={guide.name}
            url={guide.url}
          />
        ))}
      </div>
    </div>
  );
}

function Topics({ topics }: { topics: any[] }) {
  if (topics.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">Dub Topics</h2>
      <div className="mt-4 space-y-3">
        {topics.map((topic) => (
          <HelpCard
            key={topic.name}
            icon={<topic.icon className="size-5 text-neutral-600" />}
            title={topic.name}
            description={topic.description}
            url={topic.url}
          />
        ))}
      </div>
    </div>
  );
}

function NoResults({
  searchQuery,
  setScreen,
}: {
  searchQuery: string;
  setScreen?: (screen: "main" | "contact") => void;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="space-y-10">
        <div className="relative pt-4">
          <div className="absolute left-2 top-6 w-full">
            <div className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white/80 p-2 text-left">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100" />
              <div className="flex flex-col space-y-1">
                <div className="h-2 w-48 rounded bg-neutral-100" />
                <div className="h-2 w-32 rounded bg-neutral-100" />
              </div>
            </div>
          </div>

          <div className="relative w-full">
            <div className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100" />
              <div className="flex flex-col space-y-1">
                <div className="h-2 w-48 rounded bg-neutral-100" />
                <div className="h-2 w-32 rounded bg-neutral-100" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-normal text-neutral-700">
            No articles have been written about "{searchQuery}" yet
          </p>

          {setScreen && (
            <button
              onClick={() => setScreen("contact")}
              className="text-xs font-medium text-neutral-600 underline underline-offset-4"
            >
              Reach out to us if you still need help
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer({
  setScreen,
}: {
  setScreen: (screen: "main" | "contact") => void;
}) {
  return (
    <div className="sticky bottom-0 border-t border-neutral-200 bg-white">
      <div className="flex flex-col p-2">
        {footerItems.map((item) => (
          <button
            key={item.title}
            onClick={() => {
              if (item.title === "Contact support") {
                setScreen("contact");
              } else if (item.url) {
                window.open(item.url, "_blank");
              }
              item.onClick?.();
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-sm text-neutral-600 transition-colors hover:rounded-md hover:bg-neutral-50"
          >
            {item.icon}
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useHelpSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    HelpSheet: <HelpSupportSheet setIsOpen={setIsOpen} isOpen={isOpen} />,
    setIsOpen,
    isOpen,
  };
}
