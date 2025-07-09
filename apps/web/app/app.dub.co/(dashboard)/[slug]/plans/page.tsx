// "use client";

import { NextPage } from "next";
import { getUserCookieService } from "../../../../../core/services/cookie/user-session.service.ts";

interface IPlansPageProps {
  params: { slug: string };
}

const PlansPage: NextPage<Readonly<IPlansPageProps>> = async ({ params }) => {
  const { sessionId, user } = await getUserCookieService();

  console.log("PlansPage sessionId:", sessionId);
  console.log("PlansPage user:", user);

  // const { user } = useUser();
  // const { data: res, isLoading, mutate } = useGetUserProfileQuery();
  // const { data: cookieUser } = res as IUserProfileRes;

  // if (isLoading || !user?.id) {
  //   return <LayoutLoader />;
  // }

  return <div>{JSON.stringify(user)}</div>;

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
