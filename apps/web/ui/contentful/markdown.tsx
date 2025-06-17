import { Icon } from "@iconify/react";

import Markdown from "markdown-to-jsx";

import Link from "next/link";
import { FC } from "react";

interface MarkdownPageProps {
  pageContent: string;
}

export const MarkdownPage: FC<MarkdownPageProps> = ({ pageContent }) => {
  return (
    <div className="prose xs-m:max-w-none relative mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-3 py-8 text-base text-inherit text-slate-600 marker:text-inherit md:px-20 [&_ol:first-of-type_a]:text-inherit [&_ol_li]:list-decimal [&_ul_a]:text-blue-500 [&_ul_li]:list-disc">
      <Link className="-ml-1 flex w-fit items-center p-1" href="/">
        <Icon icon="gravity-ui:arrow-left" width={24} />
        <span className="ml-2 font-semibold text-slate-800">Back to home</span>
      </Link>

      <div>
        <Markdown>{pageContent}</Markdown>
      </div>
    </div>
  );
};

export default MarkdownPage;
