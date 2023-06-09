import { nFormatter } from "@/lib/utils";
import { GitFork, Star } from "lucide-react";
import { Github } from "./icons";

export interface GithubRepoProps {
  url: string;
  description: string;
  stars: number;
  forks: number;
}

export default function GithubRepo({
  url,
  description,
  stars,
  forks,
}: GithubRepoProps) {
  if (!url) {
    return null;
  }
  const [orgName, repoName] = url.replace("https://github.com/", "").split("/");
  return (
    <div className="not-prose my-5 rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-700">
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="block p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-normal">
              {orgName}/
              <span className="font-bold text-gray-800">{repoName}</span>
            </p>
            <p className="mt-2 text-sm font-normal text-gray-500">
              {description}
            </p>
          </div>
          <Github className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
        <div className="flex items-end justify-between">
          <div className="mt-4 flex items-center space-x-6">
            <div className="flex items-start space-x-2">
              <Star size={16} className="mt-1.5" />
              <div>
                <p className="font-semibold text-gray-600">
                  {nFormatter(stars)}
                </p>
                <p className="text-xs font-normal text-gray-500">Stars</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <GitFork size={16} className="mt-1.5" />
              <div>
                <p className="font-semibold text-gray-600">
                  {nFormatter(forks)}
                </p>
                <p className="text-xs font-normal text-gray-500">Forks</p>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
