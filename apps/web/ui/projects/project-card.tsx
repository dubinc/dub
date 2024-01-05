"use client";

import { DomainProps, ProjectWithDomainProps } from "@/lib/types";
import { BlurImage } from "@/ui/shared/blur-image";
import { CheckCircleFill, XCircleFill } from "@/ui/shared/icons";
import { Badge, NumberTooltip, Tooltip } from "@dub/ui";
import { GOOGLE_FAVICON_URL, fetcher, nFormatter } from "@dub/utils";
import { BarChart2, ExternalLink, Globe, Link2 } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import PlanBadge from "./plan-badge";

export default function ProjectCard({
  id,
  name,
  slug,
  logo,
  usage,
  plan,
  domains,
  primaryDomain,
}: ProjectWithDomainProps) {
  const { data: count } = useSWR<number>(
    `/api/links/count?projectSlug=${slug}`,
    fetcher,
  );
  return (
    <Link
      key={slug}
      href={`/${slug}`}
      className="flex flex-col space-y-10 rounded-lg border border-gray-100 bg-white p-6 shadow transition-all hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <BlurImage
            src={logo || `${GOOGLE_FAVICON_URL}${primaryDomain?.slug}`}
            alt={id}
            className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full"
            width={48}
            height={48}
          />
          <div>
            <h2 className="text-lg font-medium text-gray-700">{name}</h2>
            <div className="flex items-center">
              <p className="text-gray-500">{primaryDomain?.slug}</p>
              <Tooltip
                content={
                  <DomainsTooltip
                    domains={domains}
                    title={
                      domains.length > 1
                        ? "Here are all the domains for this project."
                        : primaryDomain?.verified
                        ? "Your domain is verified. You can start adding links."
                        : "Please verify your domain to start adding links."
                    }
                    cta={
                      domains.length > 1
                        ? "Manage Domains"
                        : primaryDomain?.verified
                        ? "Manage Domain"
                        : "Verify Domain"
                    }
                    href={`/${slug}/domains`}
                  />
                }
              >
                <div className="ml-1 flex items-center">
                  {domains.length > 1 ? (
                    <Badge variant="gray">+{domains.length - 1}</Badge>
                  ) : primaryDomain?.verified ? (
                    <CheckCircleFill className="h-5 w-5 text-blue-500" />
                  ) : (
                    <XCircleFill className="h-5 w-5 text-gray-300" />
                  )}
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
        <PlanBadge plan={plan} />
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 text-gray-500">
          <Globe className="h-4 w-4" />
          <h2 className="whitespace-nowrap text-sm">
            {nFormatter(domains.length)} domain{domains.length > 1 && "s"}
          </h2>
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
            <div className="h-4 w-8 animate-pulse rounded-md bg-gray-200" />
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
        {domains.map(({ slug, verified }) => (
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
              <p className="text-sm font-semibold text-gray-500">{slug}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-500 md:invisible md:group-hover:visible" />
          </a>
        ))}
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
