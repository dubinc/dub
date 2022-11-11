import ErrorPage from "next/error";
import Link from "next/link";
import AppLayout from "@/components/layout/app";
import BlurImage from "@/components/shared/blur-image";
import { Lock } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Stats from "@/components/stats";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";

export default function StatsPage() {
  const { project, isOwner, error } = useProject();
  const { exceededUsage } = useUsage();

  // handle error page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <AppLayout>
      {exceededUsage && (
        <MaxWidthWrapper>
          <div className="my-10 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white py-12">
            <div className="rounded-full bg-gray-100 p-3">
              <Lock className="h-6 w-6 text-gray-600" />
            </div>
            <h1 className="my-3 text-xl font-semibold text-gray-700">
              Stats Locked
            </h1>
            <p className="z-10 max-w-sm text-center text-sm text-gray-600">
              {isOwner
                ? "You have exceeded your usage limits. We're still collecting data on your link, but you need to upgrade to view them."
                : "The owner of this project has exceeded their usage limits. We're still collecting data on this link, but they need to upgrade to view them."}
            </p>
            <BlurImage
              src="/_static/illustrations/video-park.svg"
              alt="No links yet"
              width={400}
              height={400}
              className="-my-8"
            />
            {isOwner && (
              <Link
                href="/settings"
                className="z-10 rounded-md border border-black bg-black px-10 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black"
              >
                Upgrade now
              </Link>
            )}
          </div>
        </MaxWidthWrapper>
      )}
      {project && !exceededUsage && <Stats domain={project.domain} />}
    </AppLayout>
  );
}
