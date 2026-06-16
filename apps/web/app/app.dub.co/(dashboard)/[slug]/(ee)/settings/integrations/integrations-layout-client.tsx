"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ChevronRight } from "@dub/ui";
import { capitalize } from "@dub/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Fragment, ReactNode } from "react";
import {
  IntegrationsSubpageProvider,
  useIntegrationsSubpage,
} from "./integrations-subpage-context";

function IntegrationsBreadcrumb({
  segments,
}: {
  segments: { label: string; href?: string }[];
}) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/${slug}/settings/integrations`}
        className="transition-all duration-150 hover:text-neutral-600 active:scale-95"
      >
        Integrations
      </Link>
      {segments.map((segment, index) => (
        <Fragment key={`${segment.label}-${index}`}>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          {segment.href ? (
            <Link
              href={segment.href}
              className="transition-all duration-150 hover:text-neutral-600 active:scale-95"
            >
              {segment.label}
            </Link>
          ) : (
            <h1>{segment.label}</h1>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function IntegrationsLayoutContent({ children }: { children: ReactNode }) {
  const { slug, integrationSlug } = useParams<{
    slug: string;
    integrationSlug?: string;
  }>();
  const pathname = usePathname();
  const { title: subpageTitle } = useIntegrationsSubpage();

  const isEnabledPage = pathname?.endsWith("/integrations/enabled");
  const isManagePage = pathname?.endsWith("/manage");
  const isIntegrationPage =
    Boolean(integrationSlug) &&
    integrationSlug !== "enabled" &&
    integrationSlug !== "new";

  const integrationName =
    subpageTitle ||
    (integrationSlug ? capitalize(integrationSlug.replace(/-/g, " ")) : null);

  let title: ReactNode = "Integrations";
  let hideTitleInfo = false;

  if (isEnabledPage) {
    title = <IntegrationsBreadcrumb segments={[{ label: "Enabled" }]} />;
    hideTitleInfo = true;
  } else if (isIntegrationPage && integrationName) {
    title = (
      <IntegrationsBreadcrumb
        segments={
          isManagePage
            ? [
                {
                  label: integrationName,
                  href: `/${slug}/settings/integrations/${integrationSlug}`,
                },
                { label: "Manage" },
              ]
            : [{ label: integrationName }]
        }
      />
    );
    hideTitleInfo = true;
  }

  return (
    <PageContent
      title={title}
      titleInfo={
        hideTitleInfo
          ? undefined
          : {
              title:
                "Use Dub with your existing favorite tools with our seamless integrations.",
              href: "https://dub.co/integrations",
            }
      }
    >
      <PageWidthWrapper className="max-w-[800px] pb-20">
        {children}
      </PageWidthWrapper>
    </PageContent>
  );
}

export function IntegrationsLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <IntegrationsSubpageProvider>
      <IntegrationsLayoutContent>{children}</IntegrationsLayoutContent>
    </IntegrationsSubpageProvider>
  );
}
