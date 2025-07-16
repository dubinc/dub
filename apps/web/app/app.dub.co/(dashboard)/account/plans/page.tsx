import { convertSessionUserToCustomerBody, getSession } from "@/lib/auth";
import LayoutLoader from "@/ui/layout/layout-loader.tsx";
import { PageContent } from "@/ui/layout/page-content";
import PlansContent from "@/ui/plans/plans-content.tsx";
import { MaxWidthWrapper } from "@dub/ui";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";
import { Suspense } from "react";

interface IPlansPageProps {
  params: { slug: string };
}

export const revalidate = 0;

const PlansPage: NextPage<Readonly<IPlansPageProps>> = async ({ params }) => {
  const { user: cookieUser } = await getUserCookieService();
  const { user: authUser } = await getSession();

  const user = authUser.paymentData
    ? convertSessionUserToCustomerBody(authUser)
    : cookieUser;

  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Plans and Payments">
        <MaxWidthWrapper>
          <PlansContent user={user!} />
        </MaxWidthWrapper>
      </PageContent>
    </Suspense>
  );
};

export default PlansPage;
