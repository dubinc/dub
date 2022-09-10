import AppLayout from "components/layout/app";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import LinkCard from "@/components/app/link-card";
import PlaceholderCard from "@/components/app/placeholder-card";
import { useEffect } from "react";
import { ProjectProps } from "@/lib/types";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useAddModal } from "@/components/app/add-modal";
import Tooltip from "@/components/shared/tooltip";

export default function ProjectLinks() {
  const router = useRouter();
  const { slug } = router.query as {
    slug: string;
  };

  const { data, error } = useSWR<ProjectProps>(
    router.isReady && `/api/projects/${slug}`,
    fetcher
  );

  useEffect(() => {
    if (error) {
      router.push("/404");
    }
  }, [error]);

  const { setShowAddModal, AddModal } = useAddModal({ slug });

  return (
    <AppLayout>
      <AddModal />
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">Links</h1>
            {data?.verified ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-gray-500 hover:border-black dark:hover:border-white active:scale-95 font-medium text-sm px-5 py-2 border rounded-md border-gray-200 dark:border-gray-600 transition-all duration-75"
              >
                Add
              </button>
            ) : (
              <Tooltip content="You can only start adding links after your project domain is configured.">
                <button
                  onClick={() => setShowAddModal(true)}
                  disabled={true}
                  className="text-gray-300 cursor-not-allowed font-medium text-sm px-5 py-2 border rounded-md border-gray-200 dark:border-gray-600 transition-all duration-75"
                >
                  Add
                </button>
              </Tooltip>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div className="my-10 grid grid-cols-1 gap-3">
          {data?.links && data.links.length > 0
            ? data.links.map((props) => (
                <LinkCard key={props.key} props={props} slug={slug} />
              ))
            : Array.from({ length: 3 }).map((_, i) => (
                <PlaceholderCard key={i} />
              ))}
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
