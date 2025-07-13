// "use client";

import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";

interface IPlansPageProps {
  params: { slug: string };
}

const PlansPage: NextPage<Readonly<IPlansPageProps>> = async ({ params }) => {
  const { sessionId, user } = await getUserCookieService();

  // const { user } = useUser();
  // const { data: res, isLoading, mutate } = useGetUserProfileQuery();
  // const { data: cookieUser } = res as IUserProfileRes;

  // if (isLoading || !user?.id) {
  //   return <LayoutLoader />;
  // }

  if (sessionId) {
    return <div>{JSON.stringify(sessionId)}</div>;
  }

  // return (
  //   <Suspense fallback={<LayoutLoader />}>
  //     <PageContent title="Plans and Payments">
  //       <MaxWidthWrapper>
  //         {user ? (
  //           <PlansContent
  //             authUser={user}
  //             cookieUser={cookieUser!}
  //             reloadUserCookie={mutate}
  //           />
  //         ) : (
  //           <LoadingSpinner />
  //         )}
  //       </MaxWidthWrapper>
  //     </PageContent>
  //   </Suspense>
  // );
};

export default PlansPage;
