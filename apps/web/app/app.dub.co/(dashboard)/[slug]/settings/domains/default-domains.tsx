"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useDefaultDomains from "@/lib/swr/use-default-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import { Logo, Switch, TooltipContent } from "@dub/ui";
import {
  Amazon,
  CalendarDays,
  ChatGPT,
  Figma,
  GitHubEnhanced,
  GoogleEnhanced,
  Spotify,
} from "@dub/ui/icons";
import { DUB_DOMAINS } from "@dub/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function DubDomainsIcon(domain: string) {
  switch (domain) {
    case "chatg.pt":
      return ChatGPT;
    case "git.new":
      return GitHubEnhanced;
    case "spti.fi":
      return Spotify;
    case "cal.link":
      return CalendarDays;
    case "amzn.id":
      return Amazon;
    case "ggl.link":
      return GoogleEnhanced;
    case "fig.page":
      return Figma;
    default:
      return Logo;
  }
}

export function DefaultDomains() {
  const { id, plan, role, flags } = useWorkspace();
  const permissionsError = clientAccessCheck({
    action: "domains.write",
    role,
    customPermissionDescription: "manage default domains",
  }).error;

  const { defaultDomains: initialDefaultDomains, mutate } = useDefaultDomains();
  const [defaultDomains, setDefaultDomains] = useState<string[]>([]);
  useEffect(() => {
    if (initialDefaultDomains) {
      setDefaultDomains(initialDefaultDomains);
    }
  }, [initialDefaultDomains]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="my-10 grid gap-5 border-t border-gray-200 py-10">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-black">
          Default Domains
        </h2>
        <p className="mt-3 text-sm text-gray-500">
          Leverage default branded domains from Dub for specific links.{" "}
          <Link
            href="https://dub.co/help/article/default-dub-domains"
            target="_blank"
            className="underline transition-colors hover:text-gray-800"
          >
            Learn more.
          </Link>
        </p>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3">
        {DUB_DOMAINS.filter((domain) => {
          if (domain.slug === "dub.link") {
            return flags?.noDubLink ? false : true;
          } else if (domain.slug === "loooooooo.ng") {
            return false;
          }
          return true;
        }).map(({ slug, description }) => {
          return (
            <div
              key={slug}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5"
            >
              <DomainCardTitleColumn
                domain={slug}
                icon={DubDomainsIcon(slug)}
                description={description}
                defaultDomain
              />
              <Switch
                disabled={submitting}
                disabledTooltip={
                  permissionsError ||
                  (slug === "dub.link" && plan === "free" ? (
                    <TooltipContent
                      title="You can only use dub.link on a Pro plan and above. Upgrade to Pro to use this domain."
                      cta="Upgrade to Pro"
                      href={`/${slug}/upgrade`}
                    />
                  ) : undefined)
                }
                checked={defaultDomains?.includes(slug)}
                fn={() => {
                  const oldDefaultDomains = defaultDomains.slice();
                  const newDefaultDomains = defaultDomains.includes(slug)
                    ? defaultDomains.filter((d) => d !== slug)
                    : [...defaultDomains, slug];

                  setDefaultDomains(newDefaultDomains);
                  setSubmitting(true);
                  fetch(`/api/domains/default?workspaceId=${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      defaultDomains: newDefaultDomains.filter(
                        (d) => d !== null,
                      ),
                    }),
                  })
                    .then(async (res) => {
                      if (res.ok) {
                        toast.success(
                          `${slug} ${newDefaultDomains.includes(slug) ? "added to" : "removed from"} default domains.`,
                        );
                        await mutate();
                      } else {
                        const { error } = await res.json();
                        if (error.message.includes("Upgrade to Pro")) {
                          toast.custom(() => (
                            <UpgradeRequiredToast
                              title="You've discovered a Pro feature!"
                              message={error.message}
                            />
                          ));
                        } else {
                          toast.error(error.message);
                        }
                        setDefaultDomains(oldDefaultDomains);
                      }
                    })
                    .finally(() => setSubmitting(false));
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
