import { cn } from "@dub/utils";
import { RESOURCES } from "../../content";
import {
  Amazon,
  ChatGPT,
  GitHubEnhanced,
  GoogleEnhanced,
  Spotify,
} from "../../icons";
import { ContentProps, createHref } from "../shared";
import {
  ContentLinkCard,
  ToolLinkCard,
  contentHeadingClassName,
} from "./shared";

export function ResourcesContent({ domain }: ContentProps) {
  return (
    <div className="grid w-[32rem] grid-cols-[7fr_5fr]">
      <div className="p-5">
        <p className={cn(contentHeadingClassName, "mb-2")}>Tools</p>
        <div className="flex flex-col gap-2">
          <ToolLinkCard
            name="Spotify Link Shortener"
            href={createHref("/tools/spotify-link-shortener", domain)}
            icon={<Spotify />}
          />
          <ToolLinkCard
            name="ChatGPT Link Shortener"
            href={createHref("/tools/chatgpt-link-shortener", domain)}
            icon={<ChatGPT />}
          />
          <ToolLinkCard
            name="GitHub Link Shortener"
            href={createHref("/tools/github-link-shortener", domain)}
            icon={<GitHubEnhanced />}
          />
          <ToolLinkCard
            name="Google Link Shortener"
            href={createHref("/tools/google-link-shortener", domain)}
            icon={<GoogleEnhanced />}
          />
          <ToolLinkCard
            name="Amazon Link Shortener"
            href={createHref("/tools/amazon-link-shortener", domain)}
            icon={<Amazon />}
          />
        </div>
      </div>
      <div className="border-l border-gray-200 p-5 dark:border-white/20">
        <p className={cn(contentHeadingClassName, "mb-2")}>Resources</p>
        <div className="-mx-2 flex flex-col gap-0.5">
          {RESOURCES.map(({ icon: Icon, title, href }) => (
            <ContentLinkCard
              href={createHref(href, domain)}
              icon={
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 text-gray-600 dark:text-white/60",
                  )}
                />
              }
              title={title}
              showArrow
            />
          ))}
        </div>
      </div>
    </div>
  );
}
