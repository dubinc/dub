import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import {
  Cube,
  CursorRays,
  Globe2,
  Hyperlink,
  User,
  ShieldCheck,
} from "@dub/ui/icons";
import React, { Dispatch, SetStateAction, useState } from "react";
import { HelpContext } from "./index";

interface HelpSupportSheetProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function HelpSupportSheet({ isOpen, setIsOpen }: HelpSupportSheetProps) {
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
          <div className="grow space-y-6 overflow-y-auto p-6">
            <PopularArticles />
            <ProductGuides />
            <DubTopics />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function PopularArticles() {
  const { popularHelpArticles } = React.useContext(HelpContext);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Popular Articles
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
          {popularHelpArticles.slice(0, 4).map((article) => (
            <button
              key={article.title}
              className="flex w-full items-start gap-3 rounded-lg border border-neutral-200 bg-white p-2 text-left transition-all hover:border-neutral-300"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-neutral-800">
                  {article.title}
                </h3>
                <p className="mt-0.5 truncate text-xs text-neutral-600">
                  {article.summary}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductGuides() {
  const guides = [
    {
      name: "Dub Short Links",
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
      name: "Dub Programs",
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

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">Product Guides</h2>
      <div className="mt-4 space-y-3">
        {guides.map((guide) => (
          <button
            key={guide.name}
            className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:bg-neutral-50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
              {guide.icon}
            </div>
            <span className="text-base font-medium text-neutral-900">
              {guide.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DubTopics() {
  const topics = [
    {
      name: "Topic 1",
      description: "Learn the basics of Dub and how to get started",
      icon: Hyperlink,
    },
    {
      name: "Topic 2",
      description: "Learn the basics of Dub and how to get started",
      icon: Cube,
    },
    {
      name: "Topic 3",
      description: "Learn the basics of Dub and how to get started",
      icon: Globe2,
    },
    {
      name: "Topic 4",
      description: "Learn the basics of Dub and how to get started",
      icon: CursorRays,
    },
    {
      name: "Topic 5",
      description: "Learn the basics of Dub and how to get started",
      icon: User,
    },
    {
      name: "Topic 6",
      description: "Learn the basics of Dub and how to get started",
      icon: ShieldCheck,
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">Dub Topics</h2>
      <div className="mt-4 space-y-3">
        {topics.map((topic) => (
          <button
            key={topic.name}
            className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:bg-neutral-50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
              <topic.icon className="size-5 text-neutral-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-medium text-neutral-900">
                {topic.name}
              </h3>
              <p className="mt-0.5 text-sm text-neutral-600">
                {topic.description}
              </p>
            </div>
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
