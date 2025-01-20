"use client";
import { useTranslations } from "next-intl";

import useWorkspace from "@/lib/swr/use-workspace";
import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";

export default function IntegrationsPageHeader() {
  const t = useTranslations(
    "app.dub.co/(dashboard)/[slug]/settings/integrations",
  );

  const { slug } = useWorkspace();

  return (
    <div className="flex flex-wrap justify-between gap-2">
      <div className="flex items-center gap-x-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          {t("integrations-title")}
        </h1>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <Link
          href={`/${slug}/settings/oauth-apps`}
          className={cn(
            buttonVariants({ variant: "primary" }),
            "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
          )}
        >
          {t("create-integration-button")}
        </Link>
      </div>
    </div>
  );
}
