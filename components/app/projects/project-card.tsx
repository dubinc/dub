import Link from "next/link";
import useSWR from "swr";
import BlurImage from "#/ui/blur-image";
import { CheckCircleFill, XCircleFill } from "@/components/shared/icons";
import Tooltip, { TooltipContent } from "#/ui/tooltip";
import { ProjectWithDomainProps } from "@/lib/types";
import { fetcher, nFormatter } from "@/lib/utils";
import { BarChart2, Globe, Link2 } from "lucide-react";
import PlanBadge from "../settings/plan-badge";
import { GOOGLE_FAVICON_URL } from "@/lib/constants";

export default function ProjectCard({
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
            alt={slug}
            className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full"
            width={48}
            height={48}
          />
          <div>
            <h2 className="text-lg font-medium text-gray-700">{name}</h2>
            <div className="flex items-center">
              <p className="text-gray-500">{primaryDomain?.slug}</p>
              {primaryDomain?.verified ? (
                <Tooltip content="Verified domain">
                  <div className="flex w-8 justify-center">
                    <CheckCircleFill className="h-5 w-5 text-blue-500" />
                  </div>
                </Tooltip>
              ) : (
                <Tooltip
                  content={
                    <TooltipContent
                      title="This domain is not correctly configured. Please configure your domain to
                  start adding links."
                      cta="Configure Domain"
                      ctaLink={`/${slug}/domains`}
                    />
                  }
                >
                  <div className="flex w-8 justify-center">
                    <XCircleFill className="h-5 w-5 text-gray-300" />
                  </div>
                </Tooltip>
              )}
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
            <h2 className="whitespace-nowrap text-sm">
              {nFormatter(count)} link{count != 1 && "s"}
            </h2>
          ) : (
            <div className="h-4 w-8 animate-pulse rounded-md bg-gray-200" />
          )}
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          <BarChart2 className="h-4 w-4" />
          <h2 className="whitespace-nowrap text-sm">
            {nFormatter(usage)} click{usage != 1 && "s"}
          </h2>
        </div>
      </div>
    </Link>
  );
}
