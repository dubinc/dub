"use client";

import useDefaultDomains from "@/lib/swr/use-default-domains";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import DomainCard from "@/ui/domains/domain-card";
import DomainCardPlaceholder from "@/ui/domains/domain-card-placeholder";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import EmptyState from "@/ui/shared/empty-state";
import { Globe, Switch, useRouterStuff } from "@dub/ui";
import { DUB_DOMAINS, cn } from "@dub/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function WorkspaceDomainsClient() {
  const { id: workspaceId } = useWorkspace();

  const { AddEditDomainModal, AddDomainButton } = useAddEditDomainModal();

  const { searchParams, queryParams } = useRouterStuff();
  const { allWorkspaceDomains, loading } = useDomains({
    archived: searchParams.get("tab") === "archived" ? true : false,
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Domains
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            Use your own domains to create branded links that stand out.{" "}
            <Link
              href="https://dub.co/help/article/how-to-add-custom-domain"
              target="_blank"
              className="underline transition-colors hover:text-gray-800"
            >
              Learn more.
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DomainTabs
            selected={
              searchParams.get("tab") === "archived" ? "archived" : "active"
            }
            onSelect={(id) => queryParams({ set: { tab: id } })}
          />
          <AddDomainButton />
        </div>
      </div>
      {workspaceId && <AddEditDomainModal />}
      <div>
        {!loading ? (
          allWorkspaceDomains.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3">
              {allWorkspaceDomains.map((domain) => (
                <li key={domain.slug}>
                  <DomainCard props={domain} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
              <EmptyState
                icon={Globe}
                title={
                  searchParams.get("tab") === "archived"
                    ? "No archived domains found for this workspace"
                    : "No custom domains found for this workspace"
                }
              />
              <AddDomainButton />
            </div>
          )
        ) : (
          <DomainCardPlaceholder />
        )}
      </div>
      <div className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-black">
          Default Domains
        </h2>
        <p className="mt-3 text-sm text-gray-500">
          Choose which default domains appear when creating a link in this
          workspace.{" "}
          <Link
            href="https://dub.co/help/article/default-dub-domains"
            target="_blank"
            className="underline transition-colors hover:text-gray-800"
          >
            Learn more.
          </Link>
        </p>
      </div>
      <DefaultDomains />
    </>
  );
}

function DefaultDomains() {
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
    <div className="mt-2 grid grid-cols-1 gap-3">
      {DUB_DOMAINS.map(({ slug, description }) => (
        <div
          key={slug}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5"
        >
          <DomainCardTitleColumn
            domain={slug}
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
  );
}

const domainTabOptions = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];
export function DomainTabs({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="flex text-sm">
      {domainTabOptions.map(({ id, label }, idx) => (
        <div key={id} className="relative">
          <button
            type="button"
            onClick={() => onSelect?.(id)}
            className={cn(
              "border border-gray-200 px-5 py-2.5 transition-colors duration-75",
              id === selected
                ? "border-gray-300 bg-gray-100 text-black"
                : [
                    "text-gray-600 hover:bg-gray-50 hover:text-gray-800",
                    idx > 0 && "border-l-transparent",
                    idx < domainTabOptions.length - 1 && "border-r-transparent",
                  ],
              idx === 0 && "rounded-l-md",
              idx === domainTabOptions.length - 1 && "rounded-r-md",
            )}
            aria-selected={id === selected}
          >
            {label}
          </button>
        </div>
      ))}
    </div>
  );
}
