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
            <h1 className="text-2xl text-gray-600">Settings</h1>
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
