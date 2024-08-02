import { cn, createHref } from "@dub/utils";
import { RESOURCES } from "../../content";
import {
  Amazon,
  ChatGPT,
  Figma,
  GitHubEnhanced,
  GoogleEnhanced,
  Spotify,
} from "../../icons";
import {
  ContentLinkCard,
  ToolLinkCard,
  contentHeadingClassName,
} from "./shared";

const items = [
  {
    name: "Spotify Link Shortener",
    href: "/tools/spotify-link-shortener",
    icon: Spotify,
  },
  {
    name: "ChatGPT Link Shortener",
    href: "/tools/chatgpt-link-shortener",
    icon: ChatGPT,
  },
  {
    name: "GitHub Link Shortener",
    href: "/tools/github-link-shortener",
    icon: GitHubEnhanced,
  },
  {
    name: "Google Link Shortener",
    href: "/tools/google-link-shortener",
    icon: GoogleEnhanced,
  },
  {
    name: "Amazon Link Shortener",
    href: "/tools/amazon-link-shortener",
    icon: Amazon,
  },
  {
    name: "Figma Link Shortener",
    href: "/tools/figma-link-shortener",
    icon: Figma,
  },
];

export function ResourcesContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[32rem] grid-cols-[7fr_5fr]">
      <div className="p-5">
        <p className={cn(contentHeadingClassName, "mb-2")}>Tools</p>
        <div className="flex flex-col gap-2">
          {items.map(({ name, href, icon: Icon }) => (
            <ToolLinkCard
              name={name}
              href={createHref(href, domain, {
                utm_source: "Custom Domain",
                utm_medium: "Navbar",
                utm_campaign: domain,
                utm_content: name,
              })}
              icon={<Icon />}
            />
          ))}
        </div>
      </div>
      <div className="border-l border-gray-200 p-5 dark:border-white/20">
        <p className={cn(contentHeadingClassName, "mb-2")}>Resources</p>
        <div className="-mx-2 flex flex-col gap-0.5">
          {RESOURCES.map(({ icon: Icon, title, href }) => (
            <ContentLinkCard
              href={createHref(href, domain, {
                utm_source: "Custom Domain",
                utm_medium: "Navbar",
                utm_campaign: domain,
                utm_content: title,
              })}
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
