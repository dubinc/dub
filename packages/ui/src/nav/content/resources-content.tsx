import { ALL_TOOLS, cn } from "@dub/utils";
import Link from "next/link";
import { RESOURCES } from "../../content";
import { ContentProps, createHref } from "../shared";
import { ContentLinkCard, contentHeadingClassName } from "./shared";

export function ResourcesContent({ domain }: ContentProps) {
  return (
    <div className="grid w-[32rem] grid-cols-2">
      <div className="border-l border-gray-200 p-5">
        <p className={cn(contentHeadingClassName, "mb-2")}>Tools</p>
        <div className="flex flex-col gap-2">
          {ALL_TOOLS.map(({ name, slug }) => (
            <Link
              key={slug}
              href={createHref(`/tools/${slug}`, domain)}
              title={name}
              className="block text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
      <div className="p-5">
        <p className={cn(contentHeadingClassName, "mb-2")}>Resources</p>
        <div className="-mx-2 flex flex-col gap-0.5">
          {RESOURCES.map(({ icon: Icon, name, href }) => (
            <ContentLinkCard
              href={createHref(href, domain)}
              icon={<Icon className={cn("h-5 w-5 shrink-0 text-gray-600")} />}
              title={name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
