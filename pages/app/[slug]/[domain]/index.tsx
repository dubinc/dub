import ErrorPage from "next/error";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "@/lib/swr/use-project";
import { useRouter } from "next/router";

export default function ProjectDomains() {
  const router = useRouter();
  const { slug, domain } = router.query as {
    slug: string;
    domain: string;
  };

  const { project, error } = useProject();

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <AppLayout>
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">{domain}</h1>
          </div>
        </MaxWidthWrapper>
      </div>
    </AppLayout>
  );
}
