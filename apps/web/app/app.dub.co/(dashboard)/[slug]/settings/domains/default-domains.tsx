"use client";

import useDefaultDomains from "@/lib/swr/use-default-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { Logo, Switch } from "@dub/ui";
import { Amazon, ChatGPT, GitHubEnhanced, Spotify } from "@dub/ui/src/icons";
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
    case "amzn.id":
      return Amazon;
    default:
      return Logo;
  }
}

export function DefaultDomains() {
  const { id } = useWorkspace();
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
        {DUB_DOMAINS.map(({ slug, description }) => (
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
              checked={defaultDomains?.includes(slug)}
              fn={() => {
                const oldDefaultDomains = defaultDomains.slice();
                const newDefaultDomains = defaultDomains.includes(slug)
                  ? defaultDomains.filter((d) => d !== slug)
                  : [...defaultDomains, slug];

                setDefaultDomains(newDefaultDomains);
                setSubmitting(true);
                fetch(`/api/domains/default?workspaceId=${id}`, {
                  method: "PUT",
                  body: JSON.stringify({
                    defaultDomains: newDefaultDomains.filter((d) => d !== null),
                  }),
                })
                  .then(async (res) => {
                    if (res.ok) {
                      await mutate();
                    } else {
                      const error = await res.text();
                      toast.error(error);
                      setDefaultDomains(oldDefaultDomains);
                    }
                  })
                  .finally(() => setSubmitting(false));
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
