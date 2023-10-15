import { ReactNode, Suspense } from "react";
import { getProject } from "#/lib/fetchers";
import { BlurImage } from "#/ui/shared/blur-image";
import { LoadingSpinner, MaxWidthWrapper } from "@dub/ui";
import { FileX2 } from "lucide-react";
import Link from "next/link";

export default function ProjectLayout({
  params,
  children,
}: {
  params: {
    slug: string;
  };
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<ProjectAuthLoader />}>
      <ProjectAuth slug={params.slug}>{children}</ProjectAuth>
    </Suspense>
  );
}

async function ProjectAuth({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const project = await getProject({ slug });

  if (!project) {
    return (
      <MaxWidthWrapper>
        <div className="my-10 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white py-12">
          <div className="rounded-full bg-gray-100 p-3">
            <FileX2 className="h-6 w-6 text-gray-600" />
          </div>
          <h1 className="my-3 text-xl font-semibold text-gray-700">
            Project Not Found
          </h1>
          <p className="z-10 max-w-sm text-center text-sm text-gray-600">
            Bummer! The project you are looking for does not exist. You either
            typed in the wrong URL or don't have access to this project.
          </p>
          <BlurImage
            src="/_static/illustrations/coffee-call.svg"
            alt="No links yet"
            width={400}
            height={400}
          />
          <Link
            href="/"
            className="z-10 rounded-md border border-black bg-black px-10 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black"
          >
            Back to my projects
          </Link>
        </div>
      </MaxWidthWrapper>
    );
  }

  return children as JSX.Element;
}

function ProjectAuthLoader() {
  return (
    <div className="flex h-[calc(100vh-16px)] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
