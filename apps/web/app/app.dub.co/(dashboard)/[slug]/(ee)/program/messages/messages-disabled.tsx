"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PageContent } from "@/ui/layout/page-content";
import { MsgsDotted, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";

export function MessagesDisabled() {
  const { slug } = useWorkspace();

  return (
    <PageContent title="Messages">
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
        <MsgsDotted className="text-content-subtle size-10" />
        <div className="max-w-80 text-pretty text-center">
          <span className="text-base font-medium text-neutral-900">
            Messaging disabled
          </span>
          <p className="mt-2 text-pretty text-sm text-neutral-500">
            Enable messaging in your{" "}
            <Link
              href={`/${slug}/program/resources`}
              className="hover:text-content-default underline underline-offset-2"
            >
              Resources
            </Link>{" "}
            to message your partners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${slug}/program/resources`}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-9 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm font-medium",
            )}
          >
            View resources
          </Link>
        </div>
      </div>
    </PageContent>
  );
}
