"use client";

import usePrograms from "@/lib/swr/use-programs";
import useWorkspace from "@/lib/swr/use-workspace";
import { BetaFeatures } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import {
  Books2,
  CircleInfo,
  ConnectedDots,
  ConnectedDots4,
  CubeSettings,
  Gear2,
  Gift,
  Globe,
  Key,
  Receipt2,
  ShieldCheck,
  Users6,
  Webhook,
} from "@dub/ui/icons";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import UserSurveyButton from "../user-survey";
import { CursorRays } from "./icons/cursor-rays";
import { Gear } from "./icons/gear";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { SidebarNav, SidebarNavAreas } from "./sidebar-nav";
import { Usage } from "./usage";
import { WorkspaceDropdown } from "./workspace-dropdown";

const NAV_AREAS: SidebarNavAreas<{
  slug: string;
  queryString: string;
  flags?: Record<BetaFeatures, boolean>;
  programs?: { id: string }[];
  session?: Session | null;
}> = {
  // Top-level
  default: ({ slug, queryString, programs }) => {
    const t = useTranslations();

    return {
      showSwitcher: true,
      showNews: true,
      direction: "left",
      content: [
        {
          items: [
            {
              name: t("links"),
              icon: Hyperlink,
              href: `/${slug}`,
              exact: true,
            },
            {
              name: t("analytics"),
              icon: LinesY,
              href: `/${slug}/analytics${queryString}`,
            },
            {
              name: t("events"),
              icon: CursorRays,
              href: `/${slug}/events${queryString}`,
            },
            {
              name: t("settings"),
              icon: Gear,
              href: `/${slug}/settings`,
            },
          ],
        },
        ...(programs?.length
          ? [
              {
                name: t("programs"),
                items: [
                  {
                    name: t("affiliate"),
                    icon: ConnectedDots4,
                    href: `/${slug}/programs/${programs[0].id}`,
                    items: [
                      {
                        name: t("overview"),
                        href: `/${slug}/programs/${programs[0].id}`,
                        exact: true,
                      },
                      {
                        name: t("partners"),
                        href: `/${slug}/programs/${programs[0].id}/partners`,
                      },
                      {
                        name: t("sales"),
                        href: `/${slug}/programs/${programs[0].id}/sales`,
                      },
                      {
                        name: t("payouts"),
                        href: `/${slug}/programs/${programs[0].id}/payouts`,
                      },
                      {
                        name: t("branding"),
                        href: `/${slug}/programs/${programs[0].id}/branding`,
                      },
                      {
                        name: t("resources"),
                        href: `/${slug}/programs/${programs[0].id}/resources`,
                      },
                      {
                        name: t("configuration"),
                        href: `/${slug}/programs/${programs[0].id}/settings`,
                      },
                    ],
                  },
                ],
              },
            ]
          : []),
      ],
    };
  },

  // Workspace settings
  workspaceSettings: ({ slug, flags }) => {
    const t = useTranslations();

    return {
      title: t("settings"),
      backHref: `/${slug}`,
      content: [
        {
          name: t("workspace"),
          items: [
            {
              name: t("general"),
              icon: Gear2,
              href: `/${slug}/settings`,
              exact: true,
            },
            {
              name: t("billing"),
              icon: Receipt2,
              href: `/${slug}/settings/billing`,
            },
            {
              name: t("domains"),
              icon: Globe,
              href: `/${slug}/settings/domains`,
            },
            {
              name: t("library"),
              icon: Books2,
              href: `/${slug}/settings/library`,
            },
            {
              name: t("people"),
              icon: Users6,
              href: `/${slug}/settings/people`,
            },
            {
              name: t("integrations"),
              icon: ConnectedDots,
              href: `/${slug}/settings/integrations`,
            },
            {
              name: t("security"),
              icon: ShieldCheck,
              href: `/${slug}/settings/security`,
            },
          ],
        },
        {
          name: t("developer"),
          items: [
            {
              name: t("apiKeys"),
              icon: Key,
              href: `/${slug}/settings/tokens`,
            },
            {
              name: t("oauthApps"),
              icon: CubeSettings,
              href: `/${slug}/settings/oauth-apps`,
            },
            ...(flags?.webhooks
              ? [
                  {
                    name: t("webhooks"),
                    icon: Webhook,
                    href: `/${slug}/settings/webhooks`,
                  },
                ]
              : []),
          ],
        },
        {
          name: t("account"),
          items: [
            {
              name: t("notifications"),
              icon: CircleInfo,
              href: `/${slug}/settings/notifications`,
            },
          ],
        },
      ],
    };
  },

  // User settings
  userSettings: ({ session, slug }) => {
    const t = useTranslations();

    return {
      title: t("settings"),
      backHref: `/${slug}`,
      content: [
        {
          name: t("account"),
          items: [
            {
              name: t("general"),
              icon: Gear2,
              href: "/account/settings",
              exact: true,
            },
            {
              name: t("security"),
              icon: ShieldCheck,
              href: "/account/settings/security",
            },
            ...(session?.user?.["referralLinkId"]
              ? [
                  {
                    name: t("referrals"),
                    icon: Gift,
                    href: "/account/settings/referrals",
                  },
                ]
              : []),
          ],
        },
      ],
    };
  },
};

export function AppSidebarNav({
  toolContent,
  newsContent,
}: {
  toolContent?: ReactNode;
  newsContent?: ReactNode;
}) {
  const { slug } = useParams() as { slug?: string };
  const pathname = usePathname();
  const { flags } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const { data: session } = useSession();
  const { programs } = usePrograms();

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith(`/${slug}/settings`)
        ? "workspaceSettings"
        : "default";
  }, [slug, pathname]);

  return (
    <SidebarNav
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        slug: slug || "",
        queryString: getQueryString(),
        flags,
        programs,
        session: session || undefined,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      switcher={<WorkspaceDropdown />}
      bottom={
        <>
          <UserSurveyButton />
          <Usage />
        </>
      }
    />
  );
}
