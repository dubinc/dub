import Link from "next/link";
import useSWR from "swr";
import { fetcher, nFormatter } from "@/lib/utils";
import { ProjectProps } from "@/lib/types";
import {
  CheckCircleFill,
  XCircleFill,
  Link as LinkIcon,
} from "@/components/shared/icons";
import BlurImage from "@/components/shared/blur-image";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";

export default function ProjectCard({
  name,
  slug,
  domain,
  domainVerified,
}: ProjectProps) {
  const { data: count, isValidating } = useSWR<number>(
    domainVerified && `/api/projects/${slug}/domains/${domain}/links/count`,
    fetcher,
    {
      keepPreviousData: true,
    }
  );
  return (
    <Link key={slug} href={`/${slug}`}>
      <a>
        <div className="bg-white shadow rounded-lg p-6 flex justify-between hover:shadow-md transition-all">
          <div className="flex items-center space-x-3">
            <BlurImage
              src={`https://avatar.tobi.sh/${slug}`}
              alt={name}
              className="w-9 h-9 flex-shrink-0 rounded-full overflow-hidden border border-gray-300"
              width={48}
              height={48}
            />
            <div>
              <h2 className="text-lg font-medium text-gray-700">{name}</h2>
              <div className="flex items-center">
                <p className="text-gray-500">{domain}</p>
                {domainVerified ? (
                  <Tooltip content="Verified domain">
                    <div className="w-8 flex justify-center">
                      <CheckCircleFill className="w-5 h-5 text-blue-500" />
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
                    <div className="w-8 flex justify-center">
                      <XCircleFill className="w-5 h-5 text-gray-300" />
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LinkIcon className="text-gray-600 w-5 h-5" />
            {isValidating ? (
              <div className="w-4 h-5 rounded-md bg-gray-200 animate-pulse" />
            ) : (
              <h2 className="text-lg font-medium text-gray-700">
                {nFormatter(count)}
              </h2>
            )}
          </div>
        </div>
      </a>
    </Link>
  );
}
