import Link from "next/link";
import { ExpandingArrow } from "../icons";
import { HelpPost } from "contentlayer/generated";

export default function HelpArticleLink({ article }: { article: HelpPost }) {
  return (
    <Link
      href={`/help/article/${article.slug}`}
      className="group flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-purple-100 active:bg-purple-200 sm:px-4"
    >
      <h3 className="text-sm font-medium text-gray-600 group-hover:text-purple-600 sm:text-base">
        {article.title}
      </h3>
      <ExpandingArrow className="-ml-4 h-4 w-4 text-gray-400 group-hover:text-purple-600" />
    </Link>
  );
}
