import Link from "next/link";
import useSWR from "swr";
import BlurImage from "@/components/shared/blur-image";
import {
  CheckCircleFill,
  Link as LinkIcon,
  XCircleFill,
} from "@/components/shared/icons";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import { ProjectProps } from "@/lib/types";
import { fetcher, nFormatter } from "@/lib/utils";

export default function ProjectCard({
  name,
  slug,
  logo,
  domain,
  domainVerified,
}: ProjectProps) {
  const { data: count } = useSWR<number>(
    `/api/projects/${slug}/domains/${domain}/links/count`,
    fetcher,
  );
  return (
    <Link key={slug} href={`/${slug}`}>
      <div className="flex justify-between rounded-lg bg-white p-6 shadow transition-all hover:shadow-md">
        <div className="flex items-center space-x-3">
          <BlurImage
            src={
              logo ||
              `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`
            }
            alt={slug}
            className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full"
            width={48}
            height={48}
          />
          <div>
            <h2 className="text-lg font-medium text-gray-700">{name}</h2>
            <div className="flex items-center">
              <p className="text-gray-500">{domain}</p>
              {domainVerified ? (
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
                      ctaLink={`/${slug}/settings`}
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
        <div className="flex items-center space-x-2">
          <LinkIcon className="h-5 w-5 text-gray-600" />
          {count || count === 0 ? (
            <h2 className="text-lg font-medium text-gray-700">
              {nFormatter(count)}
            </h2>
          ) : (
            <div className="h-5 w-4 animate-pulse rounded-md bg-gray-200" />
          )}
        </div>
      </div>
    </Link>
  );
}
