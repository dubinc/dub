import AppLayout from "components/layout/app";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { ProjectProps } from "@/lib/api/types";

export default function App() {
  const { data } = useSWR<ProjectProps[]>(`/api/projects`, fetcher);

  return (
    <AppLayout>
      <div className="my-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data
          ? data.map(({ name, slug }) => (
              <Link key={slug} href={`/${slug}`}>
                <a>
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 hover:shadow-lg transition-all">
                    <h2 className="text-xl font-bold">{name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{slug}</p>
                  </div>
                </a>
              </Link>
            ))
          : null}
      </div>
    </AppLayout>
  );
}
