"use client";

import useUser from "@/lib/swr/use-user.ts";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import PlansContent from "@/ui/plans/plans-content.tsx";
import { LoadingSpinner, MaxWidthWrapper } from "@dub/ui";
import { useGetUserProfileQuery } from "core/api/user/user.hook.tsx";
import { IUserProfileRes } from "core/api/user/user.interface.ts";
import { NextPage } from "next";
import { Suspense } from "react";

interface IPlansPageProps {
  params: { slug: string };
}

const PlansPage: NextPage<Readonly<IPlansPageProps>> = ({ params }) => {
  const { user } = useUser();
  const { data: res, isLoading, mutate } = useGetUserProfileQuery();
  const { data: cookieUser } = res as IUserProfileRes;

  if (isLoading) {
    return <LayoutLoader />;
  }

  if (!user?.id) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Plans and Payments">
        <MaxWidthWrapper>
          {user ? (
            <PlansContent
              authUser={user}
              cookieUser={cookieUser!}
              reloadUserCookie={mutate}
            />
          ) : (
            <LoadingSpinner />
          )}
        </MaxWidthWrapper>
      </PageContent>
    </Suspense>
  );
};

export default PlansPage;
