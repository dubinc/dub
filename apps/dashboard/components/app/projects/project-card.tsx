import Link from "next/link";
import useSWR from "swr";
import BlurImage from "#/ui/blur-image";
import { CheckCircleFill, XCircleFill } from "@/components/shared/icons";
import Tooltip, { DomainsTooltip } from "#/ui/tooltip";
import { ProjectWithDomainProps } from "#/lib/types";
import { fetcher, nFormatter } from "#/lib/utils";
import { BarChart2, Globe, Link2 } from "lucide-react";
import PlanBadge from "./plan-badge";
import { GOOGLE_FAVICON_URL } from "#/lib/constants";
import Badge from "#/ui/badge";
import Number from "#/ui/number";

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
    `/api/links/_count?slug=${slug}`,
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
                    <Badge text={`+${domains.length - 1}`} variant="gray" />
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
        <div className="flex items-center space-x-2 text-gray-500">
          <Globe className="h-4 w-4" />
          <h2 className="whitespace-nowrap text-sm">
            {nFormatter(domains.length)} domain{domains.length > 1 && "s"}
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          <Link2 className="h-4 w-4" />
          {count || count === 0 ? (
            <Number value={count} unit="links">
              <h2 className="whitespace-nowrap text-sm">
                {nFormatter(count)} link{count != 1 && "s"}
              </h2>
            </Number>
          ) : (
            <div className="h-4 w-8 animate-pulse rounded-md bg-gray-200" />
          )}
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          <BarChart2 className="h-4 w-4" />
          <Number value={usage}>
            <h2 className="whitespace-nowrap text-sm">
              {nFormatter(usage)} click{usage != 1 && "s"}
            </h2>
          </Number>
        </div>
      </div>
    </Link>
  );
}
