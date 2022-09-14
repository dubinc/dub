import Link from "next/link";
import useSWR from "swr";
import { fetcher, nFormatter } from "@/lib/utils";
import { ProjectProps } from "@/lib/types";
import { CheckCircleFill, XCircleFill, Chart } from "@/components/shared/icons";
import BlurImage from "../shared/blur-image";

export default function ProjectCard({
  name,
  slug,
  domain,
  domainVerified,
}: ProjectProps) {
  const { data } = useSWR<{ totalClicks: number }>(
    domainVerified && `/api/projects/${slug}/domains/${domain}/usage`,
    fetcher
  );
  return (
    <Link key={slug} href={`/${slug}`}>
      <a>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex justify-between hover:shadow-md transition-all">
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
              <div className="flex space-x-1 items-center">
                <p className="text-gray-500 dark:text-gray-400">{domain}</p>
                {domainVerified ? (
                  <CheckCircleFill className="w-5 h-5 text-blue-500" />
                ) : (
                  <XCircleFill className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Chart className="text-gray-600 dark:text-gray-400 w-7 h-7" />
            <h2 className="text-lg font-medium text-gray-700">
              {nFormatter(data?.totalClicks!)}
            </h2>
          </div>
        </div>
      </a>
    </Link>
  );
}
