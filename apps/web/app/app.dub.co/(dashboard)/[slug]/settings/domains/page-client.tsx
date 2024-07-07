"use client";

import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import DomainCard from "@/ui/domains/domain-card";
import DomainCardPlaceholder from "@/ui/domains/domain-card-placeholder";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import EmptyState from "@/ui/shared/empty-state";
import { Globe, useRouterStuff } from "@dub/ui";
import { ToggleGroup } from "@dub/ui/src/toggle-group";
import Link from "next/link";
import { DefaultDomains } from "./default-domains";

export default function WorkspaceDomainsClient() {
  const { id: workspaceId } = useWorkspace();

  const { AddEditDomainModal, AddDomainButton } = useAddEditDomainModal({
    buttonProps: {
      className: "h-9 rounded-lg",
    },
  });

  const { searchParams, queryParams } = useRouterStuff();
  const tab = searchParams.get("tab") || "active";
  const { allWorkspaceDomains, loading } = useDomains({
    archived: tab === "archived" ? true : false,
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
          <ToggleGroup
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
            selected={tab}
            selectAction={(id) => queryParams({ set: { tab: id } })}
          />
          <AddDomainButton />
        </div>
      </div>
      {workspaceId && <AddEditDomainModal />}
      <div key={tab} className="animate-fade-in">
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
                  tab === "archived"
                    ? "No archived domains found for this workspace"
                    : "No custom domains found for this workspace"
                }
              />
              <AddDomainButton />
            </div>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <li key={idx}>
                <DomainCardPlaceholder />
              </li>
            ))}
          </ul>
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
