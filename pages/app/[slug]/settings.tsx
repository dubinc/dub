import ErrorPage from "next/error";
import CustomDomain from "@/components/app/settings/custom-domain";
import DeleteProject from "@/components/app/settings/delete-project";
import DefaultPage from "@/components/app/settings/landing-page";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";
import useProject from "@/lib/swr/use-project";

export default function ProjectLinks() {
  const { error } = useProject();

  // handle error page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

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
        <div className="py-10 grid gap-5">
          <CustomDomain />
          <DefaultPage />
          <DeleteProject />
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
