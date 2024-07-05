"use client";

import useDomains from "@/lib/swr/use-domains";
import useUser from "@/lib/swr/use-user";
import { DomainProps, WorkspaceProps } from "@/lib/types";
import { CheckCircleFill, XCircleFill } from "@/ui/shared/icons";
import {
  Badge,
  BlurImage,
  Globe2,
  InlineSnippet,
  NumberTooltip,
  Tooltip,
} from "@dub/ui";
import {
  DICEBEAR_AVATAR_URL,
  cn,
  fetcher,
  nFormatter,
  punycode,
} from "@dub/utils";
import { BarChart2, ExternalLink, Link2, MinusCircle } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import PlanBadge from "./plan-badge";
import WorkspaceArrow from "./workspace-arrow";

export default function WorkspaceCard({
  id,
  name,
  slug,
  logo,
  usage,
  plan,
}: WorkspaceProps) {
  const {
    allWorkspaceDomains: domains,
    primaryDomain,
    verified,
    loading,
  } = useDomains({ id });

  const { data: count } = useSWR<number>(
    `/api/links/count?workspaceId=${id}`,
    fetcher,
  );

  const { user } = useUser();

  const isMigratedWorkspace = user?.migratedWorkspace === id;

  return (
    <div className="group relative">
      {isMigratedWorkspace && (
        <>
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-red-600 to-violet-600 opacity-25 blur-lg transition duration-1000 group-hover:opacity-75 group-hover:duration-200" />
          <WorkspaceArrow className="absolute -bottom-20 right-56 z-10 text-violet-600 lg:right-0" />
          <div className="absolute -bottom-28 right-0 z-10 w-full max-w-[16rem] rounded-lg border border-gray-200 bg-white p-3 text-center text-sm shadow lg:-right-56">
            <p>
              Your <InlineSnippet>dub.sh</InlineSnippet> links have been
              migrated to a custom workspace.
            </p>
            <a
              href="https://dub.co/changelog/dub-links-updates"
              target="_blank"
              className="mt-1 block text-gray-500 underline underline-offset-4 hover:text-gray-800"
            >
              Read the changelog.
            </a>
          </div>
        </>
      )}
      <Link
        key={slug}
        href={`/${slug}`}
        className={cn(
          "relative flex flex-col justify-between space-y-10 rounded-lg border border-gray-100 bg-white p-6 shadow transition-all hover:shadow-lg",
          {
            "border-violet-600": isMigratedWorkspace,
          },
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <BlurImage
              src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
              alt={id}
              className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full"
              width={48}
              height={48}
            />
            <div>
              <h2 className="max-w-[200px] truncate text-lg font-medium text-gray-700">
                {name}
              </h2>
              {loading ? (
                <div className="mt-1 flex items-center space-x-2">
                  <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
                  <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
                </div>
              ) : (
                <div className="flex items-center">
                  <p className="text-gray-500">{primaryDomain}</p>
                  <Tooltip
                    content={
                      <DomainsTooltip
                        domains={domains}
                        title={
                          domains.length === 0
                            ? "No domains added yet – currently using Dub default domains."
                            : verified === false
                              ? "Please verify your domain to start adding links."
                              : "Here are all the domains for this workspace."
                        }
                        cta={
                          domains.length === 0
                            ? "Add Domain"
                            : verified === false
                              ? "Verify Domain"
                              : `Manage Domain${domains.length > 1 ? "s" : ""}`
                        }
                        href={`/${slug}/domains`}
                      />
                    }
                  >
                    <div className="ml-1 flex items-center">
                      {domains.length > 1 ? (
                        <Badge
                          variant="gray"
                          className="border-gray-300 transition-all hover:bg-gray-200"
                        >
                          +{domains.length - 1}
                        </Badge>
                      ) : domains.length === 0 ? (
                        <MinusCircle
                          fill="rgb(209 213 219)"
                          className="h-5 w-5 text-white"
                        />
                      ) : verified ? (
                        <CheckCircleFill className="h-5 w-5 text-blue-500" />
                      ) : verified === false ? (
                        <XCircleFill className="h-5 w-5 text-gray-300" />
                      ) : null}
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
          <PlanBadge plan={plan} />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-gray-500">
            <Globe2 className="h-4 w-4" />
            {loading ? (
              <div className="h-4 w-16 animate-pulse rounded-md bg-gray-200" />
            ) : (
              <h2 className="whitespace-nowrap text-sm">
                {nFormatter(domains.length)} domain{domains.length != 1 && "s"}
              </h2>
            )}
          </div>
          <div className="flex items-center space-x-1 text-gray-500">
            <Link2 className="h-4 w-4" />
            {count || count === 0 ? (
              <NumberTooltip value={count} unit="links">
                <h2 className="whitespace-nowrap text-sm">
                  {nFormatter(count)} link{count != 1 && "s"}
                </h2>
              </NumberTooltip>
            ) : (
              <div className="h-4 w-16 animate-pulse rounded-md bg-gray-200" />
            )}
          </div>
          <div className="flex items-center space-x-1 text-gray-500">
            <BarChart2 className="h-4 w-4" />
            <NumberTooltip value={usage}>
              <h2 className="whitespace-nowrap text-sm">
                {nFormatter(usage)} click{usage != 1 && "s"}
              </h2>
            </NumberTooltip>
          </div>
        </div>
      </Link>
    </div>
  );
}

const DomainsTooltip = ({
  domains,
  title,
  cta,
  href,
}: {
  domains: DomainProps[];
  title: string;
  cta?: string;
  href: string;
}) => {
  return (
    <div
      className="flex w-full flex-col items-center space-y-2 p-4 md:w-60"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-2 text-sm text-gray-500">{title}</p>
      <div className="flex w-full flex-col">
        {domains.slice(0, 8).map(({ slug, verified }) => (
          <a
            key={slug}
            href={`https://${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-md p-2 transition-all hover:bg-gray-100"
          >
            <div className="flex items-center space-x-1">
              {verified ? (
                <CheckCircleFill className="h-5 w-5 text-blue-500" />
              ) : (
                <XCircleFill className="h-5 w-5 text-gray-300" />
              )}
              <p className="text-sm font-semibold text-gray-500">
                {punycode(slug)}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-500 md:invisible md:group-hover:visible" />
          </a>
        ))}
        {domains.length > 8 && (
          <Link
            href={href}
            className="flex items-center space-x-1 rounded-md p-2 transition-all hover:bg-gray-100"
          >
            <p className="text-sm font-semibold text-gray-500">
              +{domains.length - 8} more
            </p>
            <ExternalLink className="h-4 w-4 text-gray-500 md:invisible" />
          </Link>
        )}
      </div>

      <div className="mt-2 w-full px-2">
        <Link
          href={href}
          className="block rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
};
