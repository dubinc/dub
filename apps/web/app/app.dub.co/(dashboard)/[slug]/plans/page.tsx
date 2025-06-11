"use client";

import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import PlansContent from "@/ui/plans/plans-content.tsx";
import { MaxWidthWrapper } from "@dub/ui";
import { useGetUserProfileQuery } from "core/api/user/user.hook.tsx";
import { IUserProfileRes } from "core/api/user/user.interface.ts";
import { NextPage } from "next";
import { Suspense } from "react";

interface IPlansPageProps {
  params: { slug: string };
}

const PlansPage: NextPage<Readonly<IPlansPageProps>> = ({ params }) => {
  const { slug } = params;

  const { data: res, isLoading, mutate } = useGetUserProfileQuery();
  const { data: user } = res as IUserProfileRes;

  if (isLoading) {
    return <LayoutLoader />;
  }

  if (!user?.id) {
    return <div>No user found in cookies. Slug: {slug}</div>;
  }

  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Plans and Payments">
        <MaxWidthWrapper>
          <PlansContent cookieUser={user} reloadUserCookie={mutate} />
        </MaxWidthWrapper>
      </PageContent>
    </Suspense>
  );
};

export default PlansPage;
