import AppLayout from "components/layout/app";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { useEffect } from "react";
import { ProjectProps } from "@/lib/types";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import CustomDomain from "@/components/app/custom-domain";

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

  return (
    <AppLayout>
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">Settings</h1>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div className="my-10 grid gap-5">
          {/* Custom Domain Div */}
          <CustomDomain domain={data?.domain || ""} />
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
