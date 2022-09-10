import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { ProjectProps } from "@/lib/types";

export default function ProjectCard({ name, slug }: ProjectProps) {
  return (
    <Link key={slug} href={`/${slug}`}>
      <a>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 hover:shadow-md transition-all">
          <h2 className="text-xl font-bold">{name}</h2>
          <p className="text-gray-500 dark:text-gray-400">{slug}</p>
        </div>
      </a>
    </Link>
  );
}
